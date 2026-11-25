import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  DEMO_CREDENTIALS,
  SignInScreen,
  SignOutButton,
  SignUpScreen,
  selectIsAuthenticated,
} from '../../features/auth';
import {
  CreateTaskScreen,
  EditTaskScreen,
  TaskDetailsScreen,
  TaskListScreen,
} from '../../features/tasks';
import { useAppSelector } from '../store/hooks';
import type { RootStackParamList, RootStackScreenProps } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SignInRoute({ navigation }: RootStackScreenProps<'SignIn'>) {
  // The demo credentials hint is passed from here, so the screen has no idea
  // they come from a mock; drop the prop when real authentication arrives.
  return (
    <SignInScreen
      onGoToSignUp={() => navigation.navigate('SignUp')}
      demoCredentials={DEMO_CREDENTIALS}
    />
  );
}

function SignUpRoute({ navigation }: RootStackScreenProps<'SignUp'>) {
  // Signing up also signs in, which swaps the whole stack; nothing to do here on success.
  return <SignUpScreen onGoToSignIn={() => navigation.goBack()} />;
}

function TaskListRoute({ navigation }: RootStackScreenProps<'TaskList'>) {
  return (
    <TaskListScreen
      onAddTask={() => navigation.navigate('CreateTask')}
      onOpenTask={taskId => navigation.navigate('TaskDetails', { taskId })}
    />
  );
}

function CreateTaskRoute({ navigation }: RootStackScreenProps<'CreateTask'>) {
  // The list is re-read from SQLite by the create thunk, so going back shows the new task.
  return <CreateTaskScreen onCreated={() => navigation.goBack()} />;
}

function TaskDetailsRoute({
  navigation,
  route,
}: RootStackScreenProps<'TaskDetails'>) {
  const { taskId } = route.params;
  return (
    <TaskDetailsScreen
      taskId={taskId}
      onEdit={() => navigation.navigate('EditTask', { taskId })}
      // The delete thunk re-reads the list and summary, so the list is already current.
      onDeleted={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  );
}

function EditTaskRoute({
  navigation,
  route,
}: RootStackScreenProps<'EditTask'>) {
  // Edit is pushed on top of Details, so going back lands on the updated details.
  return (
    <EditTaskScreen
      taskId={route.params.taskId}
      onUpdated={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  );
}

/**
 * Which screens exist depends on whether someone is signed in (React
 * Navigation's recommended auth flow). Signing out removes the task screens and
 * the stack shows Sign In again, so Back can never return to them.
 */
export function RootNavigator() {
  const isSignedIn = useAppSelector(selectIsAuthenticated);

  return (
    <Stack.Navigator>
      {isSignedIn ? (
        <>
          <Stack.Screen
            name="TaskList"
            component={TaskListRoute}
            options={{
              title: 'Tasks',
              headerRight: SignOutButton,
            }}
          />
          <Stack.Screen
            name="CreateTask"
            component={CreateTaskRoute}
            options={{ title: 'New task' }}
          />
          <Stack.Screen
            name="TaskDetails"
            component={TaskDetailsRoute}
            options={{ title: 'Task details' }}
          />
          <Stack.Screen
            name="EditTask"
            component={EditTaskRoute}
            options={{ title: 'Edit task' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="SignIn"
            component={SignInRoute}
            // Signing out animates like going back, not like opening a screen.
            options={{ headerShown: false, animationTypeForReplace: 'pop' }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpRoute}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
