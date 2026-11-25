import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Shown while signed out.
  SignIn: undefined;
  SignUp: undefined;
  // Shown while signed in.
  TaskList: undefined;
  CreateTask: undefined;
  TaskDetails: { taskId: string };
  EditTask: { taskId: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
