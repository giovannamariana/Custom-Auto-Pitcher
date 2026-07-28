# CustomAutoPitcher

![License GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows-lightgrey)

O **CustomAutoPitcher** é uma ferramenta open-source desenvolvida para automatizar, customizar e agilizar o tuning de curvas de pitch (portamento, vibrato e legatos) para síntese de voz no **OpenUTAU** e ecossistema **UTAU**.

A aplicação conta com uma interface web intuitiva para criação, edição e teste em tempo real de regras condicionais personalizadas.

---

## Funcionalidades

- **Regras Condicionais Flexíveis:** Aplique efeitos com base em intervalos (deltas de nota anterior/próxima), duração da nota e presença de silêncio/pausas.
- **Filtro de Fonética Avançado:** Crie regras específicas para diferentes categorias de fonemas (`C Plosivo`, `C Suave`, `Vogal / VV / +` e `Pausa`).
- **Suporte Completo a Legatos e OpenUTAU:** Tratamento refinado para transições suaves de encontros vocálicos e extensões (`+`).
- **Visualização em Tempo Real:** Canvas interativo que renderiza a curva de pitch resultante conforme você ajusta os parâmetros.
- **Variação Aleatória (Randomization):** Adicione pequenas variações nos parâmetros de PBS/PBW e vibrato para um tuning mais humano e natural.
- **Exportação Simples:** Salve e carregue suas regras em arquivos JSON organizados.

---

## Como Executar

### Pré-requisitos
- **Python 3.10 ~ 3.14** 

### Instalação

1. **Clone o repositório ou baixe a última versão em releases**
   ```bash
   git clone [https://github.com/giovannamariana/CustomAutoPitcher.git](https://github.com/giovannamariana/CustomAutoPitcher.git)
   cd CustomAutoPitcher

Precisa colocar dentro da pasta plugins do OpenUtau
/home/USUÁRIO/.local/share/OpenUtau/Plugins/CustomAutoPitcher

2. **Crie e ative um ambiente virtual e instale as dependências** (opcional, mas recomendado):
   ```bash
   python -m venv venv && ./venv/bin/python -m pip install -r requirements.txt

3. **Instale as dependências**
   ```bash
   python -m pip install -r requirements.txt

---

## Utilização

1. Precisa colocar dentro da pasta plugins do OpenUtau
/home/USUÁRIO/.local/share/OpenUtau/Plugins/CustomAutoPitcher (para linux)

<img width="712" height="739" alt="Captura_de_tela_20260728_131256" src="https://github.com/user-attachments/assets/8cc9180e-4fdf-41ec-bd2d-b398a8917c25" />

Para Windows, precisa ir nesse arquivo e mudar de run.sh -> run.bat

<img width="256" height="57" alt="1" src="https://github.com/user-attachments/assets/34845c63-ac8e-4243-9ff6-01b75687f17e" />

<img width="377" height="132" alt="2" src="https://github.com/user-attachments/assets/14c69436-248f-4a52-ba78-da2e37a0e657" />

2. **Iniciar editor**
   ```bash
   ./venv/bin/python editor.py # com venv
   python editor.py # sem venv

## Como Usar o Editor de Regras
1. Adicionar/Editar Regra: Crie uma nova regra no menu lateral e dê um nome descritivo (ex: Legato VV Suave). Neste repositório tem um por padrão para facilitar.
2. Definir Condições:
- Ajuste o intervalo de semitons aceitos (Delta Anterior).
- Marque a qual Tipo de Fonema essa regra se aplica (se nada for marcado, aplica-se a todos).
- Configure a duração mínima da nota (Length Min).
3. Configurar Efeitos:
- Portamento: Escolha entre o modo Proporcional ou adicione Pontos Fixos personalizados no gráfico. (tem configurações de randomizers!)
- Vibrato: Ajuste tamanho, período, profundidade, fade-in/out e oscilações. (tem configurações de randomizer!)
4. DUPLO CLIQUE para adicionar ponto ou remover ponto (versão 1.0.3!!!)
5. Exportar: Clique em salvar/exportar para gerar seu arquivo de regras em .json pronto para ser processado pela engine.

<img width="1621" height="1008" alt="Captura_de_tela_20260728_131213" src="https://github.com/user-attachments/assets/8518fc5c-41de-40b9-96b2-efca3731e4d2" />

<img width="829" height="903" alt="Captura_de_tela_20260728_131316" src="https://github.com/user-attachments/assets/3d6146e9-bf3d-4ded-968a-bb08db76f206" />


## Tecnologias Utilizadas
- Back-end: Python
- Front-end: HTML5, CSS3, JavaScript (Vanilla ES6)
- Engine de Áudio/Fonética: Algoritmos customizados para interpretação de fonemas e curvas Bezier/Pitch de UTAU.

## Licença
Este projeto está licenciado sob a licença GNU General Public License v3.0 (GPLv3) - consulte o arquivo LICENSE para obter mais detalhes.
