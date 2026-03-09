import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import RoomScreen from '../screens/home/RoomScreen';
import WhosSpyScreen from '../screens/games/WhosSpyScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Room" component={RoomScreen} />
      <Stack.Screen name="WhosSpy" component={WhosSpyScreen} />
    </Stack.Navigator>
  );
}
