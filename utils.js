const $ = id => document.getElementById(id); // Alias for brevity
const clamp = (a, b, c) => Math.max(a, Math.min(b, c));

const autoResize = function (text) {
  const resizeTextarea = () => {
    text.style.height = 'auto';
    text.style.height = clamp(0, text.scrollHeight, 500) + 'px';
  };
  text.addEventListener('change', resizeTextarea);
  text.addEventListener('cut', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('paste', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('input', () => setTimeout(resizeTextarea, 0));
  setTimeout(resizeTextarea, 0);
};

/**
 * Returns a click handler used to make a text field editable.
 * @param editTrigger - The element that triggers the edit. 
 * @param dyntext - The text field that displays the dynamic content
 * @param dyninput - The input field used to edit the content
 * @param changeHandler - a callback that takes the new content
 * @returns edit() - a function that makes the text field editable
 */
const makeDynamicField = function (editTrigger, dyntext, dyninput, changeHandler) {
  const updateAndSave = () => {
    const good = changeHandler(dyninput.value);
    if (good)
      dyntext.innerText = dyninput.value;
    else
      dyninput.value = dyntext.innerText;
    dyntext.classList.add('on');
    dyninput.classList.remove('on');
  };

  const edit = () => {
    if (document.activeElement === dyninput)
      return false; // Don't do anything if the board is already being edited
    dyninput.value = dyntext.innerText;
    dyntext.classList.remove('on');
    dyninput.classList.add('on');

    dyninput.focus();
    setTimeout(() => dyninput.select(), 0);
  };

  dyninput.addEventListener('focusout', updateAndSave);
  editTrigger.addEventListener('click', edit);
  return edit;
};


