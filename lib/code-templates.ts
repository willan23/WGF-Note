/**
 * Templates de código para múltiplas linguagens
 */

import { CodeLanguage } from './types-extended';

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: CodeLanguage;
  code: string;
  category: string;
}

// Templates Python
const PYTHON_TEMPLATES: CodeTemplate[] = [
  {
    id: 'py-hello',
    name: 'Hello World',
    description: 'Programa simples que imprime uma mensagem',
    language: 'python',
    code: 'print("Olá, Mundo!")',
    category: 'Básico',
  },
  {
    id: 'py-loop',
    name: 'Loop For',
    description: 'Exemplo de iteração com for',
    language: 'python',
    code: 'for i in range(10):\n    print(f"Número: {i}")',
    category: 'Controle',
  },
  {
    id: 'py-function',
    name: 'Função',
    description: 'Definição de função com parâmetros',
    language: 'python',
    code: 'def saudacao(nome):\n    """Função que saudação um utilizador"""\n    return f"Olá, {nome}!"\n\nprint(saudacao("João"))',
    category: 'Funções',
  },
  {
    id: 'py-class',
    name: 'Classe',
    description: 'Definição de classe com métodos',
    language: 'python',
    code: 'class Pessoa:\n    def __init__(self, nome, idade):\n        self.nome = nome\n        self.idade = idade\n    \n    def apresentar(self):\n        return f"Olá, sou {self.nome} e tenho {self.idade} anos"',
    category: 'Programação Orientada a Objetos',
  },
  {
    id: 'py-list',
    name: 'Manipulação de Listas',
    description: 'Operações comuns com listas',
    language: 'python',
    code: 'numeros = [1, 2, 3, 4, 5]\nprint(f"Lista: {numeros}")\nprint(f"Primeiro: {numeros[0]}")\nprint(f"Último: {numeros[-1]}")\nprint(f"Comprimento: {len(numeros)}")',
    category: 'Estruturas de Dados',
  },
  {
    id: 'py-dict',
    name: 'Dicionário',
    description: 'Trabalhar com dicionários (pares chave-valor)',
    language: 'python',
    code: 'pessoa = {\n    "nome": "João",\n    "idade": 30,\n    "cidade": "Lisboa"\n}\n\nfor chave, valor in pessoa.items():\n    print(f"{chave}: {valor}")',
    category: 'Estruturas de Dados',
  },
];

// Templates HTML5
const HTML_TEMPLATES: CodeTemplate[] = [
  {
    id: 'html-basic',
    name: 'Estrutura Básica',
    description: 'Estrutura HTML5 completa e válida',
    language: 'html',
    code: '<!DOCTYPE html>\n<html lang="pt-PT">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Meu Site</title>\n</head>\n<body>\n    <h1>Bem-vindo!</h1>\n    <p>Conteúdo da página</p>\n</body>\n</html>',
    category: 'Básico',
  },
  {
    id: 'html-form',
    name: 'Formulário',
    description: 'Formulário HTML com vários tipos de input',
    language: 'html',
    code: '<form action="/submit" method="POST">\n    <label for="nome">Nome:</label>\n    <input type="text" id="nome" name="nome" required>\n    \n    <label for="email">Email:</label>\n    <input type="email" id="email" name="email" required>\n    \n    <label for="mensagem">Mensagem:</label>\n    <textarea id="mensagem" name="mensagem" rows="5"></textarea>\n    \n    <button type="submit">Enviar</button>\n</form>',
    category: 'Formulários',
  },
  {
    id: 'html-table',
    name: 'Tabela',
    description: 'Tabela HTML com cabeçalho e dados',
    language: 'html',
    code: '<table border="1">\n    <thead>\n        <tr>\n            <th>Nome</th>\n            <th>Idade</th>\n            <th>Cidade</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td>João</td>\n            <td>30</td>\n            <td>Lisboa</td>\n        </tr>\n        <tr>\n            <td>Maria</td>\n            <td>28</td>\n            <td>Porto</td>\n        </tr>\n    </tbody>\n</table>',
    category: 'Tabelas',
  },
  {
    id: 'html-nav',
    name: 'Navegação',
    description: 'Barra de navegação semântica',
    language: 'html',
    code: '<nav>\n    <ul>\n        <li><a href="#home">Início</a></li>\n        <li><a href="#about">Sobre</a></li>\n        <li><a href="#services">Serviços</a></li>\n        <li><a href="#contact">Contacto</a></li>\n    </ul>\n</nav>',
    category: 'Componentes',
  },
  {
    id: 'html-semantic',
    name: 'Layout Semântico',
    description: 'Estrutura semântica com header, main, footer',
    language: 'html',
    code: '<header>\n    <h1>Meu Site</h1>\n</header>\n\n<main>\n    <article>\n        <h2>Título do Artigo</h2>\n        <p>Conteúdo do artigo aqui...</p>\n    </article>\n</main>\n\n<footer>\n    <p>&copy; 2024 Meu Site. Todos os direitos reservados.</p>\n</footer>',
    category: 'Estrutura',
  },
];

// Templates CSS
const CSS_TEMPLATES: CodeTemplate[] = [
  {
    id: 'css-reset',
    name: 'CSS Reset',
    description: 'Reset de estilos padrão do navegador',
    language: 'css',
    code: '* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}\n\nbody {\n    font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n    line-height: 1.6;\n    color: #333;\n}',
    category: 'Básico',
  },
  {
    id: 'css-flexbox',
    name: 'Flexbox Layout',
    description: 'Container flexbox com itens alinhados',
    language: 'css',
    code: '.container {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    gap: 20px;\n    flex-wrap: wrap;\n}\n\n.item {\n    flex: 1;\n    min-width: 200px;\n    padding: 20px;\n    background: #f0f0f0;\n    border-radius: 8px;\n}',
    category: 'Layout',
  },
  {
    id: 'css-grid',
    name: 'CSS Grid',
    description: 'Layout de grid responsivo',
    language: 'css',
    code: '.grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n    gap: 20px;\n    padding: 20px;\n}\n\n.grid-item {\n    background: #e0e0e0;\n    padding: 20px;\n    border-radius: 8px;\n    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n}',
    category: 'Layout',
  },
  {
    id: 'css-button',
    name: 'Botão Estilizado',
    description: 'Botão com hover e transições',
    language: 'css',
    code: '.button {\n    padding: 10px 20px;\n    background-color: #007bff;\n    color: white;\n    border: none;\n    border-radius: 4px;\n    cursor: pointer;\n    font-size: 16px;\n    transition: all 0.3s ease;\n}\n\n.button:hover {\n    background-color: #0056b3;\n    transform: translateY(-2px);\n    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);\n}',
    category: 'Componentes',
  },
  {
    id: 'css-card',
    name: 'Card Component',
    description: 'Card com sombra e espaçamento',
    language: 'css',
    code: '.card {\n    background: white;\n    border-radius: 8px;\n    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n    padding: 20px;\n    margin-bottom: 20px;\n    transition: box-shadow 0.3s ease;\n}\n\n.card:hover {\n    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);\n}\n\n.card-title {\n    font-size: 20px;\n    font-weight: bold;\n    margin-bottom: 10px;\n}\n\n.card-content {\n    color: #666;\n    line-height: 1.6;\n}',
    category: 'Componentes',
  },
  {
    id: 'css-responsive',
    name: 'Media Query Responsiva',
    description: 'Exemplo de design responsivo com media queries',
    language: 'css',
    code: '.container {\n    width: 100%;\n    padding: 20px;\n}\n\n@media (min-width: 768px) {\n    .container {\n        width: 750px;\n        margin: 0 auto;\n    }\n}\n\n@media (min-width: 1024px) {\n    .container {\n        width: 960px;\n    }\n}\n\n@media (min-width: 1216px) {\n    .container {\n        width: 1152px;\n    }\n}',
    category: 'Responsivo',
  },
];

/**
 * Obtém todos os templates para uma linguagem
 */
export function getTemplatesForLanguage(language: CodeLanguage): CodeTemplate[] {
  switch (language) {
    case 'python':
      return PYTHON_TEMPLATES;
    case 'html':
      return HTML_TEMPLATES;
    case 'css':
      return CSS_TEMPLATES;
    default:
      return [];
  }
}

/**
 * Obtém um template específico por ID
 */
export function getTemplateById(id: string): CodeTemplate | undefined {
  const allTemplates = [...PYTHON_TEMPLATES, ...HTML_TEMPLATES, ...CSS_TEMPLATES];
  return allTemplates.find(t => t.id === id);
}

/**
 * Obtém templates agrupados por categoria
 */
export function getTemplatesByCategory(language: CodeLanguage): Record<string, CodeTemplate[]> {
  const templates = getTemplatesForLanguage(language);
  const grouped: Record<string, CodeTemplate[]> = {};

  templates.forEach(template => {
    if (!grouped[template.category]) {
      grouped[template.category] = [];
    }
    grouped[template.category].push(template);
  });

  return grouped;
}
