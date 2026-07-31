import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../config/plant_config.dart';
import '../theme/app_theme.dart';

class PlantSelectionScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final userRole = state.currentUser?['role'] ?? '';

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Theme.of(context).scaffoldBackgroundColor, Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.8)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: AppTheme.primaryGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.factory, color: AppTheme.primaryGreen, size: 36),
                ),
                const SizedBox(height: 16),
                const Text('IPAK Data Pulse', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Select your plant to continue', style: TextStyle(fontSize: 14, color: Theme.of(context).textTheme.bodySmall?.color)),
                const SizedBox(height: 8),
                if (state.currentUser != null)
                  Text('Logged in as ${state.currentUser!['name']} (${state.currentUser!['role']})',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
                const SizedBox(height: 32),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 640),
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 280,
                      childAspectRatio: 1.4,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                    ),
                    itemCount: plants.length,
                    itemBuilder: (context, index) {
                      final plant = plants[index];
                      final plantColor = hexToColor(plant.color);
                      return InkWell(
                        onTap: () {
                          state.selectPlant(plant);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(plant.emoji, style: const TextStyle(fontSize: 36)),
                                const SizedBox(height: 8),
                                Text(plant.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                Container(height: 4, width: double.infinity, decoration: BoxDecoration(color: plantColor, borderRadius: BorderRadius.circular(2))),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 32),
                TextButton.icon(
                  onPressed: () => state.logout(),
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
