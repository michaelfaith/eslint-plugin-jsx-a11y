import expect from 'expect';
import getChildComponent from '../../../src/util/getChildComponent';
import JSXAttributeMock from '../../../__mocks__/JSXAttributeMock';
import JSXElementMock from '../../../__mocks__/JSXElementMock';
import JSXExpressionContainerMock from '../../../__mocks__/JSXExpressionContainerMock';

describe('getChildComponent', () => {
  describe('no FancyComponent', () => {
    it('should return undefined', () => {
      expect(getChildComponent(
        JSXElementMock('div', [], [
          JSXElementMock('div', [], [
            JSXElementMock('span', [], []),
            JSXElementMock('span', [], [
              JSXElementMock('span', [], []),
              JSXElementMock('span', [], [
                JSXElementMock('span', [], []),
              ]),
            ]),
          ]),
          JSXElementMock('span', [], []),
          JSXElementMock('img', [
            JSXAttributeMock('src', 'some/path'),
          ]),
        ]),
        'FancyComponent',
        5,
      )).toBeUndefined();
    });
  });
  describe('contains an indicated component', () => {
    it('should return input', () => {
      const MockInput = JSXElementMock('input');

      expect(getChildComponent(
        JSXElementMock('div', [], [
          MockInput,
        ]),
        'input',
      )).toEqual(MockInput);
    });
    it('should return FancyComponent', () => {
      const MockFancyComponent = JSXElementMock('FancyComponent');

      expect(getChildComponent(
        JSXElementMock('div', [], [
          MockFancyComponent,
        ]),
        'FancyComponent',
      )).toEqual(MockFancyComponent);
    });
    it('FancyComponent is outside of default depth, should return undefined', () => {
      expect(getChildComponent(
        JSXElementMock('div', [], [
          JSXElementMock('div', [], [
            JSXElementMock('FancyComponent'),
          ]),
        ]),
        'FancyComponent',
      )).toBeUndefined();
    });
    it('FancyComponent is inside of custom depth, should return component', () => {
      const MockFancyComponent = JSXElementMock('FancyComponent');
      expect(getChildComponent(
        JSXElementMock('div', [], [
          JSXElementMock('div', [], [
            MockFancyComponent,
          ]),
        ]),
        'FancyComponent',
        2,
      )).toEqual(MockFancyComponent);
    });
    it('deep nesting, should return component', () => {
      const MockFancyComponent = JSXElementMock('FancyComponent');
      expect(getChildComponent(
        JSXElementMock('div', [], [
          JSXElementMock('div', [], [
            JSXElementMock('span', [], []),
            JSXElementMock('span', [], [
              JSXElementMock('span', [], []),
              JSXElementMock('span', [], [
                JSXElementMock('span', [], [
                  JSXElementMock('span', [], [
                    MockFancyComponent,
                  ]),
                ]),
              ]),
            ]),
          ]),
          JSXElementMock('span', [], []),
          JSXElementMock('img', [
            JSXAttributeMock('src', 'some/path'),
          ]),
        ]),
        'FancyComponent',
        6,
      )).toEqual(MockFancyComponent);
    });
  });
  describe('Indeterminate situations', () => {
    describe('expression container children', () => {
      it('should return component', () => {
        const MysteryComponent = JSXExpressionContainerMock('mysteryBox');
        expect(getChildComponent(
          JSXElementMock('div', [], [
            MysteryComponent,
          ]),
          'FancyComponent',
        )).toEqual(MysteryComponent);
      });
    });
  });

  describe('Glob name matching', () => {
    describe('component name contains question mark ? - match any single character', () => {
      it('should return component', () => {
        const MockFancyComponent = JSXElementMock('FancyComponent');
        expect(getChildComponent(
          JSXElementMock('div', [], [
            MockFancyComponent,
          ]),
          'Fanc?Co??onent',
        )).toEqual(MockFancyComponent);
      });
      it('should return undefined', () => {
        expect(getChildComponent(
          JSXElementMock('div', [], [
            JSXElementMock('FancyComponent'),
          ]),
          'FancyComponent?',
        )).toBeUndefined();
      });
    });

    describe('component name contains asterisk * - match zero or more characters', () => {
      it('should return component (suffix wildcard)', () => {
        const MockFancyComponent = JSXElementMock('FancyComponent');
        expect(getChildComponent(
          JSXElementMock('div', [], [
            MockFancyComponent,
          ]),
          'Fancy*',
        )).toEqual(MockFancyComponent);
      });
      it('should return component (prefix wildcard)', () => {
        const MockFancyComponent = JSXElementMock('FancyComponent');
        expect(getChildComponent(
          JSXElementMock('div', [], [
            MockFancyComponent,
          ]),
          '*Component',
        )).toEqual(MockFancyComponent);
      });
      it('should return component (mixed wildcard)', () => {
        const MockFancyComponent = JSXElementMock('FancyComponent');
        expect(getChildComponent(
          JSXElementMock('div', [], [
            MockFancyComponent,
          ]),
          'Fancy*C*t',
        )).toEqual(MockFancyComponent);
      });
    });
  });

  describe('using a custom elementType function', () => {
    it('should return the component when the custom elementType returns the proper name', () => {
      const MockCustomInput = JSXElementMock('CustomInput');
      expect(getChildComponent(
        JSXElementMock('div', [], [
          MockCustomInput,
        ]),
        'input',
        2,
        () => 'input',
      )).toEqual(MockCustomInput);
    });
    it('should return undefined when the custom elementType returns a wrong name', () => {
      expect(getChildComponent(
        JSXElementMock('div', [], [
          JSXElementMock('CustomInput'),
        ]),
        'input',
        2,
        () => 'button',
      )).toBeUndefined();
    });
  });
});
