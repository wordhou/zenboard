/**
 * Defines the background, styles, categories of a board.
 */
function Template({ name, description, categories, def, styles }) {
  this.name = name;
  this.description = description;
  this.categories = new Map(categories);
  this.def = def;
  this.styles = styles
}

Template.default = 'Default';

Template.templates = new Map (
[
  // eslint-disable-next-line
  @@include('../templates/templates.build.js')

].map( t => [t.name, new Template(t)])
);

Template.prototype.attachCategories = function (target, map) {
  this.categories.forEach ( (cat, name) => {
    const element = document.createElement('div');
    element.className = `category cat-${name} task-drop-target`;
    element.innerHTML = `<header><h1>${cat.title}</h1></header>
    <div class="task-container cat-${name} task-drop-target"></div>`;

    map[name] = element.lastChild;
    target.appendChild(element);
  });
}

Template.prototype.attachStylesheet = function (target) {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(""));
  target.appendChild(style);
  for (let i in this.styles) {
    console.log(i,this.styles[i]);
    style.sheet.insertRule(this.styles[i], i);
  }
};


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
