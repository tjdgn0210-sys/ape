import { Redirect } from 'expo-router';

// 예전 시간 설정 화면 경로. 지금은 첫 화면(`/`)이 1단계(시간 정하기)라서 그쪽으로 보낸다. 지워도 된다.
const LegacyTimeScreen = () => <Redirect href="/" />;

export default LegacyTimeScreen;
