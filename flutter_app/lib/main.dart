// SPDX-License-Identifier: Apache-2.0
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/plant_selection_screen.dart';
import 'screens/layout_screen.dart';
import 'config/plant_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IPAKApp());
}

class IPAKApp extends StatelessWidget {
  const IPAKApp({super.key});
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..init(),
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final plantColor = state.selectedPlant?.color ?? '#16a34a';
          return MaterialApp(
            title: 'IPAK Data Pulse',
            theme: AppTheme.lightTheme(plantColor),
            darkTheme: AppTheme.darkTheme(plantColor),
            themeMode: state.darkMode ? ThemeMode.dark : ThemeMode.light,
            debugShowCheckedModeBanner: false,
            home: _buildHome(state),
          );
        },
      ),
    );
  }

  Widget _buildHome(AppState state) {
    if (state.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!state.isLoggedIn) return LoginScreen();
    if (state.selectedPlant == null) return PlantSelectionScreen();
    return LayoutScreen();
  }
}

class AppState extends ChangeNotifier {
  final ApiService api = ApiService();
  bool loading = true;
  bool isLoggedIn = false;
  bool darkMode = false;
  Plant? selectedPlant;
  String currentRoute = 'dashboard';
  Map<String, dynamic>? currentUser;
  List<String> permissions = [];
  List<Map<String, dynamic>> assignedPlants = [];

  // New: lastReportParams used for navigating from Dashboard -> Reports
  Map<String, String>? lastReportParams;

  Future<void> init() async {
    isLoggedIn = await api.isLoggedIn();
    if (isLoggedIn) {
      try {
        final me = await api.get('/auth/me');
        currentUser = me['user'];
        await _fetchPermissions();
      } catch (_) {}
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    final data = await api.login(username, password);
    if (data['ok'] == true) {
      isLoggedIn = true;
      currentUser = data['user'];
      await _fetchPermissions();
      notifyListeners();
    } else {
      throw Exception(data['error'] ?? 'Login failed');
    }
  }

  Future<void> _fetchPermissions() async {
    if (currentUser == null) return;
    try {
      final userId = currentUser!['id'];
      final perms = await api.get('/permissions/$userId');
      if (perms['ok'] == true) {
        permissions = List<String>.from(perms['permissions'] ?? []);
      }
      final plants = await api.get('/permissions/$userId/plants');
      if (plants['ok'] == true) {
        assignedPlants = List<Map<String, dynamic>>.from(plants['plants'] ?? []);
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    await api.logout();
    isLoggedIn = false;
    currentUser = null;
    selectedPlant = null;
    permissions = [];
    assignedPlants = [];
    currentRoute = 'dashboard';
    lastReportParams = null;
    notifyListeners();
  }

  void selectPlant(Plant plant) {
    selectedPlant = plant;
    currentRoute = 'dashboard';
    notifyListeners();
  }

  void navigateTo(String route) {
    currentRoute = route;
    // clear any previous params
    lastReportParams = null;
    notifyListeners();
  }

  void navigateToWithParams(String route, Map<String, String> params) {
    currentRoute = route;
    lastReportParams = params;
    notifyListeners();
  }

  void toggleDarkMode() {
    darkMode = !darkMode;
    notifyListeners();
  }
}
