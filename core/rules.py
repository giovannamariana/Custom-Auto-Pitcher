import os
import json
import sys
import random

if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def carregar_regras_json():
    caminho_json = os.path.join(os.path.dirname(__file__), "regras_tuning.json")
    if not os.path.exists(caminho_json):
        return []
    try:
        with open(caminho_json, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def aplicar_tuning_inteligente(notes):
    regras = carregar_regras_json()

    for i in range(len(notes)):
        props = notes[i]["properties"]
        tipo_fonema = props.get("_tipo_fonema", "padrao")

        if tipo_fonema == "rest" or "NoteNum" not in props:
            continue

        length = int(props.get("Length", 0))
        delta_ant = props.get("_delta_anterior", 0)

        # Contexto de Silêncio
        anterior_e_silencio = False
        if i > 0:
            ant_lyric = str(notes[i-1]["properties"].get("Lyric", "")).upper()
            if ant_lyric in ["R", "P", "SP", "AP"] or notes[i-1]["properties"].get("_tipo_fonema") == "rest" or "NoteNum" not in notes[i-1]["properties"]:
                anterior_e_silencio = True
        else:
            anterior_e_silencio = True

        proxima_e_silencio = False
        if i < len(notes) - 1:
            prox_lyric = str(notes[i+1]["properties"].get("Lyric", "")).upper()
            if prox_lyric in ["R", "P", "SP", "AP"] or notes[i+1]["properties"].get("_tipo_fonema") == "rest" or "NoteNum" not in notes[i+1]["properties"]:
                proxima_e_silencio = True
        else:
            proxima_e_silencio = True

        # Limpa chaves antigas de portamento, incluindo eventuais indexadas de execuções
        # anteriores (cache), pra nunca deixar lixo misturado com o novo formato.
        chaves_para_limpar = ["PitchBend", "PBType", "PBS", "PBW", "PBY", "PBM", "PBStart"]
        for k in list(props.keys()):
            if k.startswith("PBW") or k.startswith("PBY") or k.startswith("PBM") or k in chaves_para_limpar:
                props.pop(k, None)

        for regra in regras:
            if "condicoes" not in regra or "efeitos" not in regra:
                continue

            cond = regra["condicoes"]

            # --- NOVA VALIDAÇÃO DE FONÉTICA ---
            match_phonetics = True
            if "fonemas_permitidos" in cond and isinstance(cond["fonemas_permitidos"], list):
                permitidos = cond["fonemas_permitidos"]
                # Se a lista não estiver vazia (seletivo), o tipo_fonema atual PRECISA estar nela
                if len(permitidos) > 0 and len(permitidos) < 4:  # 4 é o total de categorias
                    match_phonetics = tipo_fonema in permitidos

            if not match_phonetics:
                continue
            # ----------------------------------

            match_ant_silencio = cond.get("anterior_e_silencio", anterior_e_silencio) == anterior_e_silencio if "anterior_e_silencio" in cond else True
            match_silencio = cond.get("proxima_e_silencio", proxima_e_silencio) == proxima_e_silencio if "proxima_e_silencio" in cond else True
            match_length = length >= cond.get("length_min", 0)

            match_delta_ant = True
            if not (anterior_e_silencio and cond.get("anterior_e_silencio", False)):
                if "delta_anterior_min" in cond and "delta_anterior_max" in cond:
                    match_delta_ant = cond["delta_anterior_min"] <= delta_ant <= cond["delta_anterior_max"]

            match_delta_prox = True
            if "delta_proxima_min" in cond and "delta_proxima_max" in cond:
                delta_prox = props.get("_delta_proxima", 0)
                match_delta_prox = cond["delta_proxima_min"] <= delta_prox <= cond["delta_proxima_max"]

            if match_delta_ant and match_ant_silencio and match_silencio and match_length and match_delta_prox:
                ef = regra["efeitos"]

                # --- PROCESSAMENTO DE PORTAMENTO (FORMATO UST: PBW/PBY como string única separada por vírgula) ---
                if "portamento" in ef:
                    p = ef["portamento"]
                    tipo_port = p.get("tipo")

                    max_rand_pbs = int(p.get("rand_pbs", 0))
                    max_rand_pbw = int(p.get("rand_pbw", 0))
                    rand_pbs = random.randint(-max_rand_pbs, max_rand_pbs) if max_rand_pbs > 0 else 0
                    rand_pbw = random.randint(-max_rand_pbw, max_rand_pbw) if max_rand_pbw > 0 else 0

                    props["PBType"] = "5"

                    if tipo_port == "proporcional":
                        fator_pby = float(p.get("fator_pby", -2.0))
                        pby_inicial = int(delta_ant * fator_pby)
                        pbs_base = int(p.get("PBS_base", -50)) + rand_pbs

                        pbw_raw = p.get("PBW", "45,25")
                        pbw_vals = [max(10, int(float(x)) + rand_pbw) for x in pbw_raw.split(",")]

                        ajuste_pitch = -delta_ant * 10 if not anterior_e_silencio else 0
                        props["PBS"] = f"{pbs_base},{ajuste_pitch}"
                        props["PBStart"] = str(pbs_base)

                        # PBY tem sempre 1 valor a menos que PBW (o(s) ponto(s) final(is) volta(m) a 0)
                        pby_vals = [str(pby_inicial)] + ["0"] * max(0, len(pbw_vals) - 1)

                        props["PBW"] = ",".join(str(w) for w in pbw_vals)
                        props["PBY"] = ",".join(pby_vals)
                        props["PBM"] = ",".join([""] * len(pbw_vals))

                    elif tipo_port == "fixo":
                        # Caso A: valores diretos vindos do JSON (a grande maioria das regras)
                        if "PBS" in p:
                            pbs_raw = str(p["PBS"])

                            if "," in pbs_raw:
                                # Já vem como "x,y" pronto
                                props["PBS"] = pbs_raw
                                props["PBStart"] = pbs_raw.split(",")[0]
                            else:
                                # Só o X foi definido: aplica o ajuste automático de pitch no Y,
                                # igual ao comportamento original que funcionava.
                                ajuste_pitch = -delta_ant * 10 if not anterior_e_silencio else 0
                                props["PBS"] = f"{pbs_raw},{ajuste_pitch}"
                                props["PBStart"] = pbs_raw

                            if "PBW" in p:
                                props["PBW"] = p["PBW"]
                                num_pontos = len(str(p["PBW"]).split(","))
                                props["PBM"] = ",".join([""] * num_pontos)
                            if "PBY" in p:
                                props["PBY"] = p["PBY"]

                        # Caso B: array de "pontos" do Canvas Web (Ex: R (N) R, R (NC) R)
                        elif "pontos" in p:
                            pontos = p["pontos"]
                            if pontos and len(pontos) > 0:
                                pontos_ordenados = sorted(pontos, key=lambda pt: float(pt["x"]))

                                # O primeiro ponto do array é o ponto de partida (PBS): X e Y
                                # vêm diretamente do que foi desenhado.
                                pbs_x = int(float(pontos_ordenados[0]["x"])) + rand_pbs
                                pbs_y = int(float(pontos_ordenados[0]["y"]))

                                props["PBS"] = f"{pbs_x},{pbs_y}"
                                props["PBStart"] = str(pbs_x)

                                if len(pontos_ordenados) == 1:
                                    # Só um ponto: gera um fechamento padrão seguro
                                    props["PBW"] = "45"
                                    props["PBY"] = "0"
                                    props["PBM"] = ""
                                else:
                                    # Do 2º ponto em diante: cada ponto vira uma largura (PBW)
                                    # e uma altura (PBY), tudo concatenado numa única string
                                    # separada por vírgula (formato que o UST realmente lê).
                                    larguras = []
                                    alturas = []
                                    for k in range(1, len(pontos_ordenados)):
                                        dist_x = int(float(pontos_ordenados[k]["x"]) - float(pontos_ordenados[k-1]["x"])) + rand_pbw
                                        if dist_x <= 0:
                                            dist_x = 30
                                        larguras.append(str(dist_x))
                                        alturas.append(str(int(float(pontos_ordenados[k]["y"]))))

                                    props["PBW"] = ",".join(larguras)
                                    props["PBY"] = ",".join(alturas)
                                    props["PBM"] = ",".join([""] * len(larguras))

                # --- PROCESSAMENTO DE VIBRATO ---
                if "vibrato" in ef and ef["vibrato"].get("ativado", True):
                    v = ef["vibrato"]

                    if "config" in v and isinstance(v["config"], str):
                        config_original = v["config"].split(",")
                        length_pct = int(config_original[0])
                        periodo_base = float(config_original[1])
                        depth = int(config_original[2])
                        fade_in = config_original[3]
                        fade_out = config_original[4]
                        phase = config_original[5]
                        offset = config_original[6]
                    else:
                        length_pct = int(v.get("length", 60))
                        periodo_base = float(v.get("period", 140))
                        depth = int(v.get("depth", 30))
                        fade_in = str(v.get("fade_in", "20"))
                        fade_out = str(v.get("fade_out", "5"))
                        phase = str(v.get("phase", "0"))
                        offset = str(v.get("offset", "0"))

                    r_d = int(v.get("rand_depth", 0))
                    r_p = int(v.get("rand_period", 0))
                    r_l = int(v.get("rand_length", 0))

                    if length < 480:
                        periodo_ajustado = int(periodo_base * 0.6)
                    elif length > 900:
                        periodo_ajustado = int(periodo_base * 1.4)
                    else:
                        periodo_ajustado = int(periodo_base)

                    if r_d > 0:
                        depth = max(5, depth + random.randint(-r_d, r_d))
                    if r_p > 0:
                        periodo_ajustado = max(40, periodo_ajustado + random.randint(-r_p, r_p))
                    if r_l > 0:
                        length_pct = max(10, min(100, length_pct + random.randint(-r_l, r_l)))

                    config_dinamica = f"{length_pct},{periodo_ajustado},{depth},{fade_in},{fade_out},{phase},{offset}"
                    props["VBR"] = config_dinamica
                    props["VBLG"] = str(length_pct)
                    props["VBOP"] = "100"

                break

    return notes