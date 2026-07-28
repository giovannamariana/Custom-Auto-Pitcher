# core/parser.py
from core.phonetics import categorizar_fonema

def parse_ust_to_list(lines):
    """Transforma as linhas do arquivo UST em uma lista estruturada de notas."""
    notes = []
    current_note = None
    header_lines = []

    for line in lines:
        line_clean = line.strip()

        if line_clean.startswith("[#") and line_clean.endswith("]"):
            if current_note:
                notes.append(current_note)

            block_name = line_clean[2:-1]
            if block_name.isdigit() or block_name == "START":
                current_note = {"_header": line_clean, "properties": {}}
            else:
                current_note = None
                header_lines.append(line)
        else:
            if current_note:
                if "=" in line_clean:
                    k, v = line_clean.split("=", 1)
                    current_note["properties"][k.strip()] = v.strip()
            else:
                header_lines.append(line)

    if current_note:
        notes.append(current_note)

    # Injeta os deltas de contexto entre as notas
    for i in range(len(notes)):
        props = notes[i]["properties"]
        props["_tipo_fonema"] = categorizar_fonema(props.get("Lyric", ""))

        if i > 0 and "NoteNum" in notes[i-1]["properties"] and "NoteNum" in props:
            nota_ant = int(notes[i-1]["properties"]["NoteNum"])
            nota_at = int(props["NoteNum"])
            props["_delta_anterior"] = nota_at - nota_ant
        else:
            props["_delta_anterior"] = 0

        if i < len(notes) - 1 and "NoteNum" in notes[i+1]["properties"] and "NoteNum" in props:
            nota_prox = int(notes[i+1]["properties"]["NoteNum"])
            nota_at = int(props["NoteNum"])
            props["_delta_proxima"] = nota_prox - nota_at
        else:
            props["_delta_proxima"] = 0

    return notes, header_lines


def rebuild_ust_texture(notes, header_lines):
    """Pega a lista de notas modificadas e reconstrói o formato de texto original da UST."""
    out_lines = []

    # Adiciona o cabeçalho original de volta
    for hl in header_lines:
        if not hl.endswith("\n"):
            hl += "\n"
        out_lines.append(hl)

    # Reconstrói cada bloco de nota
    for note in notes:
        out_lines.append(f"{note['_header']}\n")
        
        props = note["properties"]
        
        # GARANTIA ABSOLUTA: Força a remoção de chaves antigas do UTAU que conflitam com multiponto
        # Se o nosso script de regras gerou os nós, limpamos caches antigos do arquivo original
        if "PBM" in props:
            props.pop("PitchBend", None)
            props.pop("PBType", None)

        for k, v in props.items():
            # Protege as variáveis de controle internas começando com '_'
            if k.startswith("_"):
                continue
                
            # Certifica que chaves estruturais cruciais do pitch bend passem limpas e sem espaços
            out_lines.append(f"{k}={v}\n")

    return out_lines