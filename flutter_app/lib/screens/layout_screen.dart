import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../config/plant_config.dart';
import 'dashboard_screen.dart';
import 'production_entry_screen.dart';
import 'targets_screen.dart';
import 'reports_screen.dart';
import 'analytics_screen.dart';
import 'export_quantity_screen.dart';
import 'dispatch_screen.dart';
import 'dispatch_report_screen.dart';
import 'packing_cost_screen.dart';
import 'masters_screen.dart';
import 'admin_screen.dart';

class LayoutScreen extends StatefulWidget {
  @override
  State<LayoutScreen> createState() => _LayoutScreenState();
}

class _LayoutScreenState extends State<LayoutScreen> {
  bool _sidebarExpanded = true;
  bool _plantDropdownOpen = false;

  IconData _getIcon(String iconName) {
    const iconMap = {
      'dashboard': Icons.dashboard,
      'clipboard_list': Icons.list_alt,
      'target': Icons.gps_fixed,
      'file_text': Icons.description,
      'bar_chart': Icons.bar_chart,
      'ship': Icons.language,
      'truck': Icons.local_shipping,
      'package': Icons.inventory_2,
      'database': Icons.storage,
      'users': Icons.people,
      'shield': Icons.shield,
      'scroll_text': Icons.article,
    };
    return iconMap[iconName] ?? Icons.circle;
  }

  Widget _buildPage(String route, AppState state) {
    final plantName = state.selectedPlant?.name ?? '';
    final plantId = state.selectedPlant?.id ?? '';
    switch (route) {
      case 'production': return ProductionEntryScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'targets': return TargetsScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'reports': return ReportsScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'analytics': return AnalyticsScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'export': return ExportQuantityScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'dispatch': return DispatchScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'dispatch_report': return DispatchReportScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'packing': return PackingCostScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'masters': return MastersScreen(api: state.api, plant: plantName, plantId: plantId);
      case 'users': return UserManagementScreen(api: state.api);
      case 'permissions': return PermissionsScreen(api: state.api);
      case 'audit': return AuditLogsScreen(api: state.api);
      default: return DashboardScreen(api: state.api, plant: plantName, plantId: plantId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final plant = state.selectedPlant!;
    final plantColor = hexToColor(plant.color);
    final isWide = MediaQuery.of(context).size.width >= 1024;
    final userName = state.currentUser?['name'] ?? 'User';
    final userRole = state.currentUser?['role'] ?? '';
    final isAdmin = userRole == 'admin';

    final visibleItems = navItems.where((item) {
      if (item['adminOnly'] == 'true' && !isAdmin) return false;
      return true;
    }).toList();

    return Scaffold(
      body: Row(
        children: [
          if (isWide)
            _buildDesktopSidebar(state, plant, plantColor, visibleItems),
          Expanded(
            child: Column(
              children: [
                _buildTopBar(state, plant, plantColor, userName, userRole, isWide),
                Expanded(
                  child: Container(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    padding: const EdgeInsets.all(16),
                    child: _buildPage(state.currentRoute, state),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      drawer: isWide ? null : _buildMobileDrawer(state, plant, plantColor, visibleItems),
    );
  }

  Widget _buildDesktopSidebar(AppState state, Plant plant, Color plantColor, List<Map<String, String>> items) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: _sidebarExpanded ? 256 : 64,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(right: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor))),
            child: Row(
              children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(color: plantColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: Icon(Icons.factory, color: plantColor, size: 20),
                ),
                if (_sidebarExpanded) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('IPAK Data Pulse', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
                        Text(plant.name, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor), overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                ],
                IconButton(
                  icon: Icon(_sidebarExpanded ? Icons.chevron_left : Icons.chevron_right, size: 20),
                  onPressed: () => setState(() => _sidebarExpanded = !_sidebarExpanded),
                  splashRadius: 16,
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
              children: items.map((item) {
                final active = state.currentRoute == item['path'];
                final iconData = _getIcon(item['icon']!);
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: Material(
                    color: active ? plantColor : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => state.navigateTo(item['path']!),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            Icon(iconData, size: 20, color: active ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color),
                            if (_sidebarExpanded) ...[
                              const SizedBox(width: 12),
                              Expanded(child: Text(item['label']!, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: active ? Colors.white : null), overflow: TextOverflow.ellipsis)),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
            child: ListTile(
              leading: const Icon(Icons.logout, size: 20),
              title: _sidebarExpanded ? const Text('Sign Out', style: TextStyle(fontSize: 13)) : null,
              dense: true,
              onTap: () => state.logout(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileDrawer(AppState state, Plant plant, Color plantColor, List<Map<String, String>> items) {
    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: Theme.of(context).cardColor),
            child: Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: plantColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                child: Icon(Icons.factory, color: plantColor, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(child: Text('IPAK Data Pulse', style: TextStyle(fontWeight: FontWeight.bold))),
            ]),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: items.map((item) {
                final active = state.currentRoute == item['path'];
                final iconData = _getIcon(item['icon']!);
                return ListTile(
                  leading: Icon(iconData, color: active ? plantColor : null),
                  title: Text(item['label']!, style: TextStyle(fontWeight: active ? FontWeight.w600 : FontWeight.normal, color: active ? plantColor : null)),
                  selected: active,
                  selectedTileColor: plantColor.withValues(alpha: 0.1),
                  onTap: () { state.navigateTo(item['path']!); Navigator.pop(context); },
                );
              }).toList(),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign Out'),
            onTap: () { Navigator.pop(context); state.logout(); },
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(AppState state, Plant plant, Color plantColor, String userName, String userRole, bool isWide) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        children: [
          if (!isWide)
            Builder(
              builder: (ctx) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(ctx).openDrawer(),
              ),
            ),
          _buildPlantSwitcher(state, plantColor),
          const Spacer(),
          IconButton(
            icon: Icon(state.darkMode ? Icons.light_mode : Icons.dark_mode, size: 20),
            onPressed: () => state.toggleDarkMode(),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            radius: 16,
            backgroundColor: Theme.of(context).dividerColor,
            child: Text(userName.isNotEmpty ? userName[0].toUpperCase() : 'U', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 8),
          if (isWide)
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(userName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                Text(userRole, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
              ],
            ),
          const SizedBox(width: 12),
        ],
      ),
    );
  }

  Widget _buildPlantSwitcher(AppState state, Color plantColor) {
    return StatefulBuilder(
      builder: (context, setInnerState) {
        return GestureDetector(
          onTap: () => setInnerState(() => _plantDropdownOpen = !_plantDropdownOpen),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  border: Border.all(color: Theme.of(context).dividerColor),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 12, height: 12, decoration: BoxDecoration(color: plantColor, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Text(state.selectedPlant!.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 4),
                    Icon(Icons.keyboard_arrow_down, size: 18, color: Theme.of(context).hintColor),
                  ],
                ),
              ),
              if (_plantDropdownOpen)
                Positioned(
                  top: 48, left: 8,
                  child: Material(
                    elevation: 8,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 180,
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Theme.of(context).dividerColor),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: plants.map((p) {
                          final c = hexToColor(p.color);
                          return ListTile(
                            dense: true,
                            leading: Container(width: 12, height: 12, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
                            title: Text(p.name, style: const TextStyle(fontSize: 13)),
                            onTap: () {
                              state.selectPlant(p);
                              setInnerState(() => _plantDropdownOpen = false);
                            },
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
