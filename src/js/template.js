/**
 * Defines the background, styles, categories of a board.
 */
function Template({ name, description, categories, def }) {
  this.name = name;
  this.description = description;
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
    "styles": [
      "",
      "",
    ],
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
    "styles": [
      "",
      "",
    ],
    "def": "Todo"
  },
].map( t => [t.name, new Template(t)])
);

Template.prototype.attachCategories = function (target, map, stylesheet) {
  this.categories.forEach ( (cat, name) => {
    const element = document.createElement('div');
    element.className = `category cat-${name} task-drop-target`;
    element.innerHTML = `<header><h1>${cat.title}</h1></header>
    <div class="task-container cat-${name} task-drop-target"></div>`;

    map[name] = element.lastChild;
    target.appendChild(element);
  });
  for (let i in this.styles)
    stylesheet.cssRules.insertRule(this.styles[i], i);
}


Template.getTemplate = function (template) {
  return Template.templates.get(template);
}

Template.renderTemplateListing = function (template) {
  const element = document.createElement('li');
  element.className = 'template-listing';
  element.innerHTML = `<h1>${template.name}</h1>
    ${template.description}`;
  return element;
}

Template.getCatFromClassList = function (elem) {
  for (let s of elem.classList.values()) {
    if (s.substr(0,4) === 'cat-') {
      return s.substr(4);
    }
  }
};
