// import { createAppContainer } from "react-navigation";
// import { createStackNavigator } from "react-navigation-stack";
import WelcomeScreen from "../app/screens/WelcomeScreen";
import DeviceControlScreen from "../app/screens/DeviceControlScreen";

const screens = {
	WelcomeScreen: {
		screen: WelcomeScreen,
		navigationOptions: {
			headerShown: false,
		},
	},
	DeviceControlScreen: {
		screen: DeviceControlScreen,
		navigationOptions: {
			headerShown: false,
		},
	},
};
const HomeStack = createStackNavigator(screens);
const AppContainer = createAppContainer(HomeStack);
export default function Homestack() {
	return <AppContainer />;
}
