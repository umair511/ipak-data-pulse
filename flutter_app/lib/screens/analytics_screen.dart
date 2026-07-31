import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';
import '../theme/app_theme.dart';

class AnalyticsScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const AnalyticsScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _production = [];
  List<Map<String, dynamic>> _downtime = [];
  List<Map<String, dynamic>> _filmWise = [];
  List<Map<String, dynamic>> _machineWise = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final plant = widget.plant;
      final results = await Future.wait([
        widget.api.get('/analytics/production', {'plant': plant}),
        widget.api.get('/analytics/downtime', {'plant': plant}),
        widget.api.get('/analytics/film-wise', {'plant': plant}),
        widget.api.get('/analytics/machine-wise', {'plant': plant}),
      ]);
      setState(() {
        _production = List<Map<String, dynamic>>.from(results[0]['daily'] ?? []);
        _downtime = List<Map<String, dynamic>>.from(results[1]['reasons'] ?? []);
        _filmWise = List<Map<String, dynamic>>.from(results[2]['films'] ?? []);
        _machineWise = List<Map<String, dynamic>>.from(results[3]['machines'] ?? []);
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  void dispose() { _tabController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Analytics', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
        const SizedBox(height: 12),
        TabBar(controller: _tabController, isScrollable: true, tabs: const [
          Tab(text: 'Film Line'), Tab(text: 'Slitter'), Tab(text: 'Metallizer'), Tab(text: 'Targets'),
        ]),
        const SizedBox(height: 8),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) :
          TabBarView(controller: _tabController, children: [
            _buildProductionChart(),
            _buildDowntimeChart(),
            _buildFilmChart(),
            _buildMachineChart(),
          ]),
        ),
      ],
    );
  }

  Widget _buildProductionChart() {
    if (_production.isEmpty) return const Center(child: Text('No production data'));
    final entries = _production.take(30).toList();
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Daily Production (Tons)', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: entries.isEmpty ? 100 : (entries.map<double>((e) => (e['production'] ?? 0).toDouble()).fold<double>(0, (a, b) => a > b ? a : b) * 1.2),
                titlesData: FlTitlesData(show: true, bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final idx = value.toInt();
                      if (idx >= 0 && idx < entries.length) {
                        final d = entries[idx]['date']?.toString() ?? '';
                        return Text(d.length >= 5 ? d.substring(5) : d, style: const TextStyle(fontSize: 9));
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                )),
                barGroups: entries.asMap().entries.map((e) {
                  return BarChartGroupData(x: e.key, barRods: [
                    BarChartRodData(toY: (e.value['production'] ?? 0).toDouble(), color: AppTheme.primaryGreen, width: 12, borderRadius: BorderRadius.circular(3)),
                    BarChartRodData(toY: (e.value['waste'] ?? 0).toDouble(), color: Colors.red, width: 12, borderRadius: BorderRadius.circular(3)),
                  ]);
                }).toList(),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: true, drawVerticalLine: false),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDowntimeChart() {
    if (_downtime.isEmpty) return const Center(child: Text('No downtime data'));
    final colors = [Colors.red, Colors.orange, Colors.purple, Colors.blue, Colors.teal, Colors.pink, Colors.amber, Colors.indigo];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Downtime by Reason', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: PieChart(
              PieChartData(
                sections: _downtime.asMap().entries.map((e) {
                  final total = _downtime.fold<double>(0, (sum, r) => sum + (r['minutes'] ?? 0).toDouble());
                  final value = (e.value['minutes'] ?? 0).toDouble();
                  return PieChartSectionData(
                    value: value,
                    title: '${(value / total * 100).toStringAsFixed(0)}%',
                    color: colors[e.key % colors.length],
                    radius: 80,
                    titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                  );
                }).toList(),
              ),
            ),
          ),
          Wrap(spacing: 8, runSpacing: 4, children: _downtime.asMap().entries.map((e) {
            return Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(color: colors[e.key % colors.length], borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 4),
              Text('${e.value['reason'] ?? ''}: ${e.value['minutes'] ?? 0} min', style: const TextStyle(fontSize: 11)),
            ]);
          }).toList()),
        ],
      ),
    );
  }

  Widget _buildFilmChart() {
    if (_filmWise.isEmpty) return const Center(child: Text('No film data'));
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Production by Film Type', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                titlesData: const FlTitlesData(show: false),
                barGroups: _filmWise.asMap().entries.map((e) {
                  return BarChartGroupData(x: e.key, barRods: [
                    BarChartRodData(
                      toY: (e.value['production'] ?? 0).toDouble(),
                      color: AppTheme.primaryBlue,
                      width: 24,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ]);
                }).toList(),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
              ),
            ),
          ),
          Wrap(spacing: 12, children: _filmWise.map((f) => Text('${f['film'] ?? ''}: ${(f['production'] ?? 0).toStringAsFixed(1)} T', style: const TextStyle(fontSize: 12))).toList()),
        ],
      ),
    );
  }

  Widget _buildMachineChart() {
    if (_machineWise.isEmpty) return const Center(child: Text('No machine data'));
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Production by Machine', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Expanded(
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                titlesData: const FlTitlesData(show: false),
                barGroups: _machineWise.asMap().entries.map((e) {
                  return BarChartGroupData(x: e.key, barRods: [
                    BarChartRodData(
                      toY: (e.value['production'] ?? 0).toDouble(),
                      color: AppTheme.primaryGreen,
                      width: 20,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ]);
                }).toList(),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
              ),
            ),
          ),
          Wrap(spacing: 12, children: _machineWise.map((m) => Text('${m['machine'] ?? ''}: ${(m['production'] ?? 0).toStringAsFixed(1)} T', style: const TextStyle(fontSize: 12))).toList()),
        ],
      ),
    );
  }
}
