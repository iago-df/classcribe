import { Tabs } from 'expo-router';
import TabBar from '../../components/TabBar';
import { colors } from '../../theme';

export const unstable_settings = { anchor: 'index' };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      backBehavior="initialRoute"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
    >
      <Tabs.Screen name="subjects" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
    </Tabs>
  );
}
