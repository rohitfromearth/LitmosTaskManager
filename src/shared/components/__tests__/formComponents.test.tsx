import ReactTestRenderer from 'react-test-renderer';
import {
  byTestId,
  hasTestId,
  textsOf,
} from '../../../test-utils/renderHelpers';
import { ChoiceGroup } from '../ChoiceGroup';
import { TextField } from '../TextField';

type Renderer = ReactTestRenderer.ReactTestRenderer;

function render(element: React.ReactElement) {
  let renderer!: Renderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

describe('TextField', () => {
  it('shows the label, a required marker and no error by default', () => {
    const r = render(<TextField label="Title" required value="" testID="f" />);
    // The asterisk is its own nested <Text>, so it appears as a separate entry.
    expect(textsOf(r)).toContain(' *');
    expect(byTestId(r, 'f-input')[0].props.accessibilityLabel).toBe(
      'Title, required',
    );
    expect(hasTestId(r, 'f-error')).toBe(false);
  });

  it('shows the error message when given one', () => {
    const r = render(
      <TextField label="Title" value="" error="Title is required" testID="f" />,
    );
    expect(byTestId(r, 'f-error')[0].props.children).toBe('Title is required');
  });

  it('passes typed text to onChangeText and can be made read-only', () => {
    const onChangeText = jest.fn();
    const r = render(
      <TextField
        label="Title"
        value=""
        onChangeText={onChangeText}
        editable={false}
        testID="f"
      />,
    );
    byTestId(r, 'f-input')[0].props.onChangeText('abc');
    expect(onChangeText).toHaveBeenCalledWith('abc');
    expect(byTestId(r, 'f-input')[0].props.editable).toBe(false);
  });

  it('shows a counter and marks it when over the limit', () => {
    const ok = render(
      <TextField
        label="T"
        value="abc"
        counter={{ current: 3, max: 5 }}
        testID="f"
      />,
    );
    expect(textsOf(ok)).toContain('3/5');

    const over = render(
      <TextField
        label="T"
        value="abcdef"
        counter={{ current: 6, max: 5 }}
        testID="f"
      />,
    );
    const style = byTestId(over, 'f-counter')[0].props.style;
    expect(JSON.stringify(style)).toContain('fontWeight');
  });
});

describe('ChoiceGroup', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ] as const;

  it('marks only the current value as selected', () => {
    const r = render(
      <ChoiceGroup
        label="Pick"
        options={options}
        value="b"
        onChange={jest.fn()}
        testID="g"
      />,
    );
    expect(byTestId(r, 'g-a')[0].props.accessibilityState.selected).toBe(false);
    expect(byTestId(r, 'g-b')[0].props.accessibilityState.selected).toBe(true);
  });

  it('calls onChange with the pressed option', () => {
    const onChange = jest.fn();
    const r = render(
      <ChoiceGroup
        label="Pick"
        options={options}
        value="a"
        onChange={onChange}
        testID="g"
      />,
    );
    byTestId(r, 'g-b')[0].props.onPress();
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('is disabled as a whole when disabled', () => {
    const r = render(
      <ChoiceGroup
        label="Pick"
        options={options}
        value="a"
        onChange={jest.fn()}
        disabled
        testID="g"
      />,
    );
    expect(byTestId(r, 'g-a')[0].props.accessibilityState.disabled).toBe(true);
    expect(byTestId(r, 'g-b')[0].props.disabled).toBe(true);
  });
});
