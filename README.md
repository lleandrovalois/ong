# Patas & Esperança - Landing Page & CMS em Tempo Real para ONG Animal

Landing page moderna, 100% responsiva e de alta conversão para ONGs de apoio e resgate animal, desenvolvida com arquitetura de persistência e sincronização em tempo real multi-dispositivo baseada na arquitetura do **Dash Solutions**.

---

## 🌟 Principais Recursos

1. **Design Responsivo & Visual Premium**:
   - Tipografia moderna (*Outfit* e *Plus Jakarta Sans*).
   - Paleta de cores dinâmica e personalizável (Tema Esperança, Amor Vivo, Acolher ou cores customizadas).
   - Glassmorphism, sombras suaves e micro-animações interativas.
   - 100% responsivo para celulares, tablets e desktops (com menu drawer mobile dedicado).

2. **Módulo de Arrecadação & PIX**:
   - Barra de progresso dinâmica com percentual da meta alcançada em tempo real.
   - Alternância entre **Doação Única** e **Mensal (Padrinho)**.
   - Presets de valor (R$ 20, R$ 50, R$ 100, R$ 200, Personalizado) com descrição do impacto real no tratamento dos animais.
   - Botão de **Copiar Chave PIX** com 1 clique e feedback instantâneo.
   - **QR Code PIX** gerado dinamicamente para o valor e chave configurados.

3. **Vitrine de Adoção & Apadrinhamento**:
   - Filtros instantâneos: *Todos*, *Cães*, *Gatos* e *Em Tratamento*.
   - Modal com ficha médica completa: castrado, vacinado, vermifugado e histórico de resgate.
   - Botão direto para **Conversar via WhatsApp** já com o nome do animal selecionado preenchido na mensagem.

4. **Banner de Urgência Médica**:
   - Destaque no topo para animais que necessitam de cirurgias ou tratamentos emergenciais imediatos.

5. **Transparência & Prestação de Contas**:
   - Gráficos e indicadores de onde os recursos doados são aplicados (Cirurgias, Ração, Abrigo, Vacinas).

6. **Depoimentos de Famílias Adotantes (Finais Felizes)**:
   - Histórias reais de superação e transformação após a adoção responsável.

7. **Painel CMS Administrativo com Persistência em API**:
   - Qualquer alteração feita pelo administrador em um celular ou notebook é salva no servidor (`content.json`, `theme.json`, `animals.json`) com backup automático (`.bak`) e **refletida instantaneamente em todos os outros dispositivos conectados** via sincronização/polling contínuo.
   - **Gerenciador de Cores**: Altere as cores da ONG e veja o resultado ao vivo.
   - **Gerenciador de Textos & Metas**: Edite títulos, chave PIX, razão social, CNPJ e metas financeiras.
   - **Catálogo de Animais**: Adicione, edite ou exclua animais com foto, porte, status e história.
   - **Caixa de Entrada**: Visualize formulários de adoção e voluntariado preenchidos no site com link para responder direto pelo WhatsApp.
   - **Controle de Seções**: Ative ou oculte qualquer seção da página com 1 clique.

---

## 🔐 Credenciais Administrativas de Acesso

- **URL do Painel CMS**: Clique no botão **CMS** ou **Área Restrita** no topo ou no rodapé.
- **E-mail**: `admin@ongamoranimal.org`
- **Senha**: `admin123`
- *(Há um botão "Preencher automaticamente" no modal para facilitar testes e avaliações)*

---

## 🚀 Como Executar o Projeto

Certifique-se de ter o **Node.js** instalado (v16+).

1. Abra o terminal na pasta do projeto:
   ```bash
   cd C:\Users\valoi\.gemini\antigravity-ide\scratch\ong-patas-esperanca
   ```

2. Inicie o servidor:
   ```bash
   npm start
   # ou
   node server.js
   ```

3. Abra no navegador:
   ```
   http://localhost:8080
   ```

---

## 📁 Estrutura de Arquivos

```
ong-patas-esperanca/
├── index.html        # Estrutura HTML5 semântica e responsiva da Landing Page
├── style.css         # Variáveis CSS customizadas, animações e glassmorphism
├── script.js         # Lógica frontend, sincronização multi-dispositivo e CMS
├── server.js         # Servidor HTTP Node.js com endpoints de API e persistência
├── content.json      # Dados de conteúdo geral, textos, metas e seções
├── animals.json      # Catálogo de animais para adoção e tratamento
├── theme.json        # Paleta de cores e presets visuais
├── messages.json     # Mensagens recebidas pelo formulário de contato
└── package.json      # Configuração do projeto e scripts npm
```

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/version` | Retorna o timestamp de versão para sincronização instantânea de todos os clientes |
| `GET` | `/api/content` | Retorna os textos e metas oficiais (`content.json`) |
| `POST` | `/api/save-content` | Salva alterações gerais no servidor (Requer header `X-Admin-Token`) |
| `GET` | `/api/animals` | Retorna a lista de animais resgatados |
| `POST` | `/api/save-animals` | Salva o catálogo de animais atualizado (Requer header `X-Admin-Token`) |
| `GET` | `/api/theme` | Retorna o tema e paleta de cores |
| `POST` | `/api/save-theme` | Salva o novo tema de cores (Requer header `X-Admin-Token`) |
| `GET` | `/api/messages` | Lista as mensagens e candidaturas recebidas (Admin) |
| `POST` | `/api/contact` | Endpoint público para recebimento de candidaturas e formulários |
| `POST` | `/api/login` | Autenticação do administrador com retorno de token |
