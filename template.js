/**
 * Defines the background, styles, categories of a board.
 */
function Template({ name, categories, def }) {
  this.name = name;
  this.categories = new Map(categories);
  this.def = def;
}

Template.default = 'Default';

Template.templates = new Map (
[
  {
    "name": "Default",
    "description": "",
    "categories": [
      ["Todo", {
        "title": "Todo list",
        "styles": {}
      }]
    ],
    "styles": {},
    "def": "Todo"
  },
  {
    "name": "Trifold",
    "description": "",
    "categories": [
      ["Todo", {
        "title": "Todo list",
        "styles": {}
      }],
      ["Inprogress", {
        "title": "In progress",
        "styles": {}
      }],
      ["Complete", {
        "title": "Completed",
        "styles": {}
      }],
    ],
    "styles": {},
    "def": "Todo"
  },
].map( t => [t.name, new Template(t)])
);

Template.getTemplate = function (template) {
  return Template.templates.get(template);
}

Template.renderTemplateListing = function (template) {
  const element = document.createElement('li');
  element.className = 'template-listing';
  element.innerHTML = `<h1>${template.title}</h1>
    ${template.description}`;
  return element;
}

Template.prototype.renderCategory = function (cat) {
  const element = document.createElement('div');
  element.className = 'category';
  element.innerHTML = `<header>${cat}</header>
    <div class="task-container cat-${cat} task-drop-target"></div>`;
  return element;
};

Template.getCatFromClassList = function (elem) {
  for (let s of elem.classList.values()) {
    if (s.substr(0,4) === 'cat-') {
      return s.substr(4);
    }
  }
};
