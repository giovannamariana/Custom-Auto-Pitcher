# main.py (Versão Corrigida para Encoding e Diagnóstico Preventivo)
import sys
import os
import traceback

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug_log.txt")

    # Força uma escrita inicial imediata. Se o script morrer no meio, o log não fica zerado!
    try:
        with open(log_path, "w", encoding='utf-8') as f:
            f.write("Status: Script iniciado pelo OpenUTAU. Validando argumentos...\n")
    except Exception:
        pass # Fallback caso haja problema bizarro de permissão de escrita de início

    try:
        if len(sys.argv) < 2:
            with open(log_path, "a", encoding='utf-8') as f:
                f.write("Erro: Nenhum arquivo de entrada fornecido pelo OpenUTAU.\n")
            return

        filepath = sys.argv[-1]
        if not os.path.exists(filepath):
            with open(log_path, "a", encoding='utf-8') as f:
                f.write(f"Erro: Arquivo temporario nao encontrado em: {filepath}\n")
            return

        # Tenta importar o core
        try:
            from core.parser import parse_ust_to_list, rebuild_ust_texture
            from core.rules import aplicar_tuning_inteligente
        except Exception as import_error:
            with open(log_path, "a", encoding='utf-8') as f:
                f.write(f"Erro de Importacao: Nao foi possivel carregar o modulo 'core'.\n")
                f.write(f"Verifique se a pasta 'core' tem o arquivo '__init__.py' vazio dentro dela.\n\n")
                f.write(traceback.format_exc())
            return

        # Abre e lê o arquivo temporário salvando qual encoding funcionou
        encoding_usado = 'utf-8'
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            encoding_usado = 'shift_jis'
            with open(filepath, 'r', encoding='shift_jis') as f:
                lines = f.readlines()

        # Processamento
        notes, header_lines = parse_ust_to_list(lines)
        notes_tunadas = aplicar_tuning_inteligente(notes)
        out_lines = rebuild_ust_texture(notes_tunadas, header_lines)

        # Grava o resultado de volta usando RIGOROSAMENTE o mesmo encoding da leitura
        with open(filepath, 'w', encoding=encoding_usado, errors='replace') as f:
            f.writelines(out_lines)

        # Se chegou até aqui com sucesso, limpa o status inicial e escreve o sucesso definitivo
        with open(log_path, "w", encoding='utf-8') as f:
            f.write(f"Sucesso: O plugin rodou e salvou o arquivo em {encoding_usado} sem erros!")

    except Exception as e:
        error_msg = traceback.format_exc()
        with open(log_path, "a", encoding='utf-8') as f:
            f.write(f"\nFalha Critica no processamento:\n{error_msg}")

if __name__ == "__main__":
    main()
