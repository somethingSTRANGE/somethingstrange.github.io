function AddButtonListeners() {
	buttons.forEach(button => button.addEventListener('click', ToggleColumn));
}

function GetColumnTags(nodeList) {
	let stringTags = '';

	nodeList.forEach((element) => {
		if (element.hasAttribute('selected')) {
			const dataRegex = element.getAttribute('data-regex');
			if (dataRegex) {
				stringTags += `${dataRegex} `;
			}
		}
	});

	return stringTags.trim();
}

function RestoreButtonState() {
	const regex = localStorage.getItem("regex") || 'dotnet ecmascript icu';
	const array = regex.split(' ');

	buttons.forEach(button => {
		if (array.includes(button.dataset.regex)) {
			button.setAttribute('selected', '');
		} else {
			button.removeAttribute('selected');
		}
	});

	UpdateColumnVisibility();
	AddButtonListeners();
}

function ToggleColumn(event) {
	const type = event.target.dataset.regex;

	const attributeName = 'selected';
	if (event.target.hasAttribute(attributeName)) {
		event.target.removeAttribute(attributeName);
	} else {
		event.target.setAttribute(attributeName, '');
	}

	UpdateColumnVisibility();
}

function UpdateColumnVisibility() {
	const regex = GetColumnTags(buttons);
	regexTable.dataset.regex = regex;
	localStorage.setItem("regex", regex);
}

const regexTable = document.querySelector('.regex table');
const buttons = document.querySelectorAll('.regex button[data-regex]');

RestoreButtonState();