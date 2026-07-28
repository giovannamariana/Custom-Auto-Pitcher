# editor.py
import sys
import os
import json
import socket
import webbrowser
import shutil
from http.server import BaseHTTPRequestHandler, HTTPServer

# Garante o mapeamento correto de diretórios independentemente de onde o script é chamado
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CORE_DIR = os.path.join(BASE_DIR, "core")
WEB_DIR = os.path.join(BASE_DIR, "web")
CAMINHO_JSON = os.path.join(CORE_DIR, "regras_tuning.json")

class RulesEditorHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silencia os logs normais de request para deixar o console limpo
        pass

    def do_GET(self):
        if self.path == "/api/rules":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            if os.path.exists(CAMINHO_JSON):
                with open(CAMINHO_JSON, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b"[]")
        else:
            # Serve arquivos estáticos da pasta 'web'
            clean_path = self.path.split("?")[0]
            if clean_path in ["/", "/index.html"]:
                filename = os.path.join(WEB_DIR, "index.html")
                content_type = "text/html; charset=utf-8"
            elif clean_path == "/style.css":
                filename = os.path.join(WEB_DIR, "style.css")
                content_type = "text/css; charset=utf-8"
            elif clean_path == "/app.js":
                filename = os.path.join(WEB_DIR, "app.js")
                content_type = "application/javascript; charset=utf-8"
            else:
                self.send_error(404, "Arquivo não encontrado")
                return

            if os.path.exists(filename):
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.end_headers()
                with open(filename, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, f"Arquivo {filename} nao encontrado")

    def do_POST(self):
        if self.path == "/api/rules":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                # Valida se é um JSON válido antes de mexer em arquivos
                rules = json.loads(post_data.decode("utf-8"))

                # Garante que a pasta 'core' existe
                os.makedirs(CORE_DIR, exist_ok=True)

                caminho_bak = CAMINHO_JSON + ".bak"

                # Backup automático da última configuração estável se não houver um .bak criado
                if os.path.exists(CAMINHO_JSON) and not os.path.exists(caminho_bak):
                    shutil.copy2(CAMINHO_JSON, caminho_bak)
                    print(f"[*] Backup de segurança criado em: {caminho_bak}")

                # Grava o novo estado aplicando o recuo identado (legível tanto pelo Python quanto por humanos)
                with open(CAMINHO_JSON, "w", encoding="utf-8") as f:
                    json.dump(rules, f, indent=2, ensure_ascii=False)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                print("[*] Regras atualizadas e salvas com sucesso em regras_tuning.json!")
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
                print(f"[!] Erro crítico ao salvar regras: {e}")
        else:
            self.send_error(404, "Endpoint não encontrado")

    def do_OPTIONS(self):
        # CORS preflight necessário para chamadas de APIs locais
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def get_free_port():
    """Descobre dinamicamente uma porta TCP livre localmente."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        return port
    except Exception:
        return 5000  # Fallback padrão seguro
    finally:
        s.close()

def main():
    port = get_free_port()
    server_address = ('127.0.0.1', port)

    try:
        httpd = HTTPServer(server_address, RulesEditorHandler)
    except Exception as e:
        print(f"Erro ao iniciar servidor na porta {port}: {e}")
        sys.exit(1)

    url = f"http://127.0.0.1:{port}"
    print("=" * 60)
    print(f"  AUTO-PITCHER RULES EDITOR SERVER")
    print(f"  Acesse no navegador: {url}")
    print("=" * 60)
    print("Para encerrar o servidor, aperte CTRL+C no terminal.")

    # Dispara a abertura automática da interface no navegador do sistema
    webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado de forma limpa.")
        httpd.server_close()

if __name__ == "__main__":
    main()
