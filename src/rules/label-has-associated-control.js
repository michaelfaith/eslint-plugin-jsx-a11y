/**
 * @fileoverview Enforce label tags have an associated control.
 * @author Jesse Beach
 *
 * @flow
 */

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

import { getProp, getPropValue } from 'jsx-ast-utils';
import type { JSXElement } from 'ast-types-flow';
import { generateObjSchema, arraySchema } from '../util/schemas';
import type { ESLintConfig, ESLintContext, ESLintVisitorSelectorConfig } from '../../flow/eslint';
import getChildComponent from '../util/getChildComponent';
import getElementType from '../util/getElementType';
import mayContainChildComponent from '../util/mayContainChildComponent';
import mayHaveAccessibleLabel from '../util/mayHaveAccessibleLabel';

const errorMessages = {
  accessibleLabel: 'A form label must be associated with a control.',
  htmlFor: 'A form label must have a valid htmlFor attribute.',
  nesting: 'A form label must have an associated control as a descendant.',
  either: 'A form label must either have a valid htmlFor attribute or a control as a descendant.',
  both: 'A form label must have a valid htmlFor attribute and a control as a descendant.',
  htmlForShouldMatchId: 'A form label must have a htmlFor attribute that matches the id of the associated control.',
};

const schema = generateObjSchema({
  labelComponents: arraySchema,
  labelAttributes: arraySchema,
  controlComponents: arraySchema,
  assert: {
    description:
      'Assert that the label has htmlFor, a nested label, both or either',
    type: 'string',
    enum: ['htmlFor', 'nesting', 'both', 'either'],
  },
  depth: {
    description: 'JSX tree depth limit to check for accessible label',
    type: 'integer',
    minimum: 0,
  },
  shouldHtmlForMatchId: {
    description:
      'If true, the htmlFor prop of the label must match the id of the associated control',
    type: 'boolean',
  },
});

/**
 * Given a label node, validate that the htmlFor prop matches the id of a child
 * component in our list of possible control components.
 * @param node - Label node
 * @param controlComponents - List of control components
 */
const validateChildHasMatchingId = (
  node: JSXElement,
  controlComponents: string[],
  recursionDepth: number,
  elementTypeFn: (node: JSXElement) => string,
) => {
  const htmlForAttr = getProp(node.attributes, 'htmlFor');
  const htmlForValue = getPropValue(htmlForAttr);

  const eligibleChildren = controlComponents.map((name) => getChildComponent(node, name, recursionDepth, elementTypeFn));

  const matchingChild = eligibleChildren.find((child) => {
    if (!child) {
      return false;
    }

    const childIdAttr = getProp(child.openingElement.attributes, 'id');
    const childIdValue = getPropValue(childIdAttr);

    return htmlForValue === childIdValue;
  });
  return !!matchingChild;
};

/**
 * Given a label node, validate that the htmlFor prop matches the id of a sibling
 * component in our list of possible control components.
 * @param node - Label node
 * @param controlComponents - List of control components
 */
const validateSiblingHasMatchingId = (
  node: JSXElement,
  controlComponents: string[],
) => {
  const htmlForAttr = getProp(node.attributes, 'htmlFor');
  const htmlForValue = getPropValue(htmlForAttr);

  const sibling = node.parent.children.find(
    (child) => child !== node
      && controlComponents.includes(child.openingElement.name.name),
  );

  if (!sibling) {
    return false;
  }

  const siblingIdAttr = getProp(sibling.openingElement.attributes, 'id');
  const siblingIdValue = getPropValue(siblingIdAttr);

  return htmlForValue === siblingIdValue;
};

const validateHtmlFor = (node) => {
  const htmlForAttr = getProp(node.attributes, 'htmlFor');
  const htmlForValue = getPropValue(htmlForAttr);

  return htmlForAttr !== false && !!htmlForValue;
};

export default ({
  meta: {
    docs: {
      description:
        'Enforce that a `label` tag has a text label and an associated control.',
      url: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md',
    },
    schema: [schema],
  },

  create: (context: ESLintContext): ESLintVisitorSelectorConfig => {
    const options = context.options[0] || {};
    const labelComponents = options.labelComponents || [];
    const assertType = options.assert || 'either';
    const componentNames = ['label'].concat(labelComponents);
    const elementType = getElementType(context);
    const shouldHtmlForMatchId = !!options.shouldHtmlForMatchId;

    const rule = (node: JSXElement) => {
      if (componentNames.indexOf(elementType(node.openingElement)) === -1) {
        return;
      }
      const controlComponents = [
        'input',
        'meter',
        'output',
        'progress',
        'select',
        'textarea',
      ].concat(options.controlComponents || []);
      // Prevent crazy recursion.
      const recursionDepth = Math.min(
        options.depth === undefined ? 2 : options.depth,
        25,
      );
      const hasHtmlFor = validateHtmlFor(node.openingElement);
      // Check for multiple control components.
      const hasNestedControl = controlComponents.some((name) => mayContainChildComponent(node, name, recursionDepth, elementType));
      const hasAccessibleLabel = mayHaveAccessibleLabel(
        node,
        recursionDepth,
        options.labelAttributes,
        elementType,
        controlComponents,
      );

      // Bail out immediately if we don't have an accessible label.
      if (!hasAccessibleLabel) {
        context.report({
          node: node.openingElement,
          message: errorMessages.accessibleLabel,
        });
        return;
      }
      switch (assertType) {
        case 'htmlFor':
          if (!hasHtmlFor) {
            context.report({
              node: node.openingElement,
              message: errorMessages.htmlFor,
            });
            return;
          }
          break;
        case 'nesting':
          if (!hasNestedControl) {
            context.report({
              node: node.openingElement,
              message: errorMessages.nesting,
            });
            return;
          }
          break;
        case 'both':
          if (!hasHtmlFor || !hasNestedControl) {
            context.report({
              node: node.openingElement,
              message: errorMessages.both,
            });
            return;
          }
          break;
        case 'either':
          if (!hasHtmlFor && !hasNestedControl) {
            context.report({
              node: node.openingElement,
              message: errorMessages.either,
            });
            return;
          }
          break;
        default:
          break;
      }
      // Lastly, let's check to see if the htmlFor prop matches the id of a valid sibling or descendent component.
      if (shouldHtmlForMatchId && hasHtmlFor) {
        if (!validateSiblingHasMatchingId(node, controlComponents) && !validateChildHasMatchingId(node, controlComponents, recursionDepth, elementType)) {
          context.report({
            node: node.openingElement,
            message: errorMessages.shouldHtmlForMatchId,
          });
        }
      }
    };

    // Create visitor selectors.
    return {
      JSXElement: rule,
    };
  },
}: ESLintConfig);
