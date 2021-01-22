/**
 * Defines the background, styles, categories of a board.
 */
function Template({ name, categories, def }) {
  this.name = name;
  this.categories = categories;
  this.def = def;
}

Template.default = 'Default';

Template.templates = new Map (
[
  [ "Default",  {
    "name": "Default",
    "categories": ["Todo"],
    "def": "todo"
  }],
  [ "Trifold",  {
    "name": "Trifold",
    "categories": ["Todo", "In Progress", "Completed"],
    "def": "todo"
  }],
]
);

/*
Template.loadTemplates = function (json) {
  Template.templates = JSON.parse(json).map( v => [ v.name, new Template(v) ] );
};

Template.loadTemplates (`
`);
*/
