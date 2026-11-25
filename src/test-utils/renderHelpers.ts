import { Text } from 'react-native';
import type { ReactTestRenderer } from 'react-test-renderer';

/** The text of every <Text> in the tree, with child fragments joined ("2", " ", "tasks" → "2 tasks"). */
export const textsOf = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map(node => [node.props.children].flat().join(''));

/** All nodes with the given testID (a composite and its host node both match). */
export const byTestId = (renderer: ReactTestRenderer, id: string) =>
  renderer.root.findAll(node => node.props.testID === id);

/** Only the native (host) nodes with the testID: one per rendered element, so safe for counting. */
export const hostByTestId = (renderer: ReactTestRenderer, id: string) =>
  byTestId(renderer, id).filter(node => typeof node.type === 'string');

export const hasTestId = (renderer: ReactTestRenderer, id: string) =>
  byTestId(renderer, id).length > 0;
