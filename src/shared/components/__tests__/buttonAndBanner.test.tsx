import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  byTestId,
  hasTestId,
  textsOf,
} from '../../../test-utils/renderHelpers';
import { colors } from '../../theme/theme';
import { Button } from '../Button';
import { InlineBanner } from '../InlineBanner';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(() => {
  ReactTestRenderer.act(() => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

function render(element: React.ReactElement) {
  let renderer!: Renderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  rendered.push(renderer);
  return renderer;
}

const labelColor = (r: Renderer) =>
  StyleSheet.flatten(r.root.findAllByType(Text)[0].props.style).color;

describe('Button variants', () => {
  it('is primary by default (white label)', () => {
    const r = render(<Button label="Edit" onPress={() => {}} />);
    expect(labelColor(r)).toBe(colors.onPrimary);
  });

  it('secondary uses the primary color for its label', () => {
    const r = render(
      <Button label="Edit" variant="secondary" onPress={() => {}} />,
    );
    expect(labelColor(r)).toBe(colors.primary);
  });

  it('danger uses the danger color for its label and still presses', () => {
    const onPress = jest.fn();
    const r = render(
      <Button label="Delete" variant="danger" onPress={onPress} testID="b" />,
    );
    expect(labelColor(r)).toBe(colors.danger);
    byTestId(r, 'b')[0].props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('InlineBanner', () => {
  it('shows the message and an action that calls back', () => {
    const onAction = jest.fn();
    const r = render(
      <InlineBanner
        message="Couldn't refresh"
        actionLabel="Retry"
        onAction={onAction}
        testID="banner"
      />,
    );
    expect(textsOf(r)).toEqual(["Couldn't refresh", 'Retry']);
    byTestId(r, 'banner-action')[0].props.onPress();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action when none is given', () => {
    const r = render(<InlineBanner message="Oops" testID="banner" />);
    expect(hasTestId(r, 'banner-action')).toBe(false);
  });
});
