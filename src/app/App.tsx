/**
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StartupError, StartupLoading } from './bootstrap/StartupScreens';
import { useAppBootstrap } from './bootstrap/useAppBootstrap';
import { RootNavigator } from './navigation/RootNavigator';
import type { AppStore } from './store/createAppStore';

interface AppProps {
  /** Starts the app's services and returns the ready store. See Root.tsx. */
  initialize: () => Promise<AppStore>;
}

/** Shows a loading or error screen until startup succeeds, then the navigation. */
function App({ initialize }: AppProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const { state, retry } = useAppBootstrap(initialize);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {state.status === 'loading' && <StartupLoading />}
      {state.status === 'error' && (
        <StartupError message={state.message} onRetry={retry} />
      )}
      {state.status === 'ready' && (
        <Provider store={state.store}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </Provider>
      )}
    </SafeAreaProvider>
  );
}

export default App;
