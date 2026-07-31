import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';
import '../theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const DashboardScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Map<String, dynamic>> _monthSections = [];
  List<Map<String, dynamic>> _yesterdaySections = [];
  Map<String, dynamic> _dispatchMonth = {};
  Map<String, dynamic> _dispatchYesterday = {};
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  String _today() => DateTime.now().toIso8601String().substring(0, 10);
  String _yesterday() { final d = DateTime.now().subtract(const Duration(days: 1)); return d.toIso8601String().substring(0, 10); }
  String _monthStart() { final now = DateTime.now(); return DateTime(now.year, now.month, 1).toIso8601String().substring(0, 10); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final month = _monthStart(), yest = _yesterday(), plant = widget.plant;
      final results = await Future.wait([
        widget.api.get('/dashboard/kpis', {'plant': plant, 'dateFrom': month, 'dateTo': _today()}),
        widget.api.get('/dashboard/kpis', {'plant': plant, 'dateFrom': yest, 'dateTo': yest}),
        widget.api.get('/dashboard/dispatch-kpis', {'plant': plant, 'monthDateFrom': month, 'monthDateTo': _today(), 'yesterdayDate': yest}),
      ]);
      setState(() {
        _monthSections = List<Map<String, dynamic>>.from(results[0]['sections'] ?? []);
        _yesterdaySections = List<Map<String, dynamic>>.from(results[1]['sections'] ?? []);
        _dispatchMonth = Map<String, dynamic>.from(results[2]['month'] ?? {});
        _dispatchYesterday = Map<String, dynamic>.from(results[2]['yesterday'] ?? {});
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final plantColor = widget.plant.isNotEmpty ? hexToColor(plants.firstWhere((p) => p.name == widget.plant, orElse: () => plants[0]).color) : AppTheme.primaryGreen;
    if (_loading) return Center(child: CircularProgressIndicator(color: plantColor));

    final allSections = ['Film Line', 'Slitter', 'Metallizer'];
    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        children: [
          Text('Dashboard', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('${widget.plant} — Production Overview', style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
          const SizedBox(height: 20),
          for (final section in allSections) ...[
            _sectionHeader(context, section, plantColor),
            const SizedBox(height: 8),
            _kpiRow(context, _findSection(_monthSections, section), 'This Month', plantColor),
            const SizedBox(height: 8),
            _kpiRow(context, _findSection(_yesterdaySections, section), 'Yesterday', plantColor),
            const SizedBox(height: 20),
          ],
          _sectionHeader(context, 'Dispatch', Colors.blue),
          const SizedBox(height: 8),
          _dispatchRow(context, _dispatchMonth, 'This Month'),
          const SizedBox(height: 8),
          _dispatchRow(context, _dispatchYesterday, 'Yesterday'),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Map<String, dynamic> _findSection(List<Map<String, dynamic>> sections, String name) {
    return sections.firstWhere((s) => s['section'] == name, orElse: () => {'production': 0, 'waste': 0, 'wastePercent': 0, 'downtimeHours': 0, 'settings': 0, 'cycles': 0});
  }

  Widget _sectionHeader(BuildContext context, String title, Color color) {
    return Row(children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 8),
      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
    ]);
  }

  Widget _kpiRow(BuildContext context, Map<String, dynamic> data, String period, Color plantColor) {
    final production = (data['production'] ?? 0).toDouble();
    final waste = (data['waste'] ?? 0).toDouble();
    final wastePct = (data['wastePercent'] ?? 0).toDouble();
    final downtime = (data['downtimeHours'] ?? 0).toDouble();
    final settings = data['settings'] ?? 0;
    final cycles = data['cycles'] ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(period, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).hintColor, letterSpacing: 1)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12, runSpacing: 12,
          children: [
            _kpiCard(context, 'Production', production.toStringAsFixed(1), 'Tons', Icons.trending_up, plantColor),
            _kpiCard(context, 'Waste', '${wastePct.toStringAsFixed(1)}%', '${waste.toStringAsFixed(1)} Tons', Icons.trending_down, Colors.red),
            _kpiCard(context, 'Downtime', downtime.toStringAsFixed(1), 'Hours', Icons.access_time, Colors.amber),
            if (settings > 0) _kpiCard(context, 'Settings', settings.toString(), 'Total', Icons.settings, Colors.purple),
            if (cycles > 0) _kpiCard(context, 'Cycles', cycles.toString(), 'Total', Icons.flash_on, Colors.lightBlue),
          ],
        ),
      ],
    );
  }

  Widget _dispatchRow(BuildContext context, Map<String, dynamic> data, String period) {
    final total = (data['total'] ?? 0).toDouble();
    final exportTons = (data['exportTons'] ?? 0).toDouble();
    final localTons = (data['localTons'] ?? 0).toDouble();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(period, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).hintColor, letterSpacing: 1)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12, runSpacing: 12,
          children: [
            _kpiCard(context, 'Total Dispatch', total.toStringAsFixed(1), 'Tons', Icons.local_shipping, Colors.blue),
            _kpiCard(context, 'Export', exportTons.toStringAsFixed(1), 'Tons', Icons.language, Colors.green),
            _kpiCard(context, 'Local', localTons.toStringAsFixed(1), 'Tons', Icons.location_on, Colors.orange),
          ],
        ),
      ],
    );
  }

  Widget _kpiCard(BuildContext context, String label, String value, String unit, IconData icon, Color color) {
    return SizedBox(
      width: 160,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, size: 18, color: color),
                ),
              ]),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              Text(unit, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
            ],
          ),
        ),
      ),
    );
  }
}
