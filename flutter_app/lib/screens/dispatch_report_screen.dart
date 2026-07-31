import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class DispatchReportScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const DispatchReportScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<DispatchReportScreen> createState() => _DispatchReportScreenState();
}

class _DispatchReportScreenState extends State<DispatchReportScreen> {
  DateTime _dateFrom = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _dateTo = DateTime.now();
  String? _dispatchType;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _daily = [];
  bool _loading = false;

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final params = <String, String>{
        'plantName': widget.plant,
        'dateFrom': DateFormat('yyyy-MM-dd').format(_dateFrom),
        'dateTo': DateFormat('yyyy-MM-dd').format(_dateTo),
      };
      if (_dispatchType != null) params['dispatchType'] = _dispatchType!;
      final data = await widget.api.get('/dispatch/report-summary', params);
      setState(() {
        _summary = Map<String, dynamic>.from(data);
        _daily = List<Map<String, dynamic>>.from(data['daily'] ?? []);
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Dispatch Report', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 16),
      Wrap(spacing: 12, runSpacing: 12, children: [
        SizedBox(width: 150, child: GestureDetector(
          onTap: () async { final d = await showDatePicker(context: context, initialDate: _dateFrom, firstDate: DateTime(2024), lastDate: DateTime(2030));
            if (d != null) setState(() => _dateFrom = d); },
          child: InputDecorator(decoration: const InputDecoration(labelText: 'From', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            child: Text(DateFormat('yyyy-MM-dd').format(_dateFrom))),
        )),
        SizedBox(width: 150, child: GestureDetector(
          onTap: () async { final d = await showDatePicker(context: context, initialDate: _dateTo, firstDate: DateTime(2024), lastDate: DateTime(2030));
            if (d != null) setState(() => _dateTo = d); },
          child: InputDecorator(decoration: const InputDecoration(labelText: 'To', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            child: Text(DateFormat('yyyy-MM-dd').format(_dateTo))),
        )),
        SizedBox(width: 160, child: DropdownButtonFormField<String>(
          value: _dispatchType, isExpanded: true,
          decoration: const InputDecoration(labelText: 'Type', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
          items: [const DropdownMenuItem(value: null, child: Text('All')), const DropdownMenuItem(value: 'Export', child: Text('Export')), const DropdownMenuItem(value: 'Local', child: Text('Local'))],
          onChanged: (v) => setState(() => _dispatchType = v),
        )),
        SizedBox(height: 40, child: ElevatedButton.icon(onPressed: _fetch, icon: const Icon(Icons.search, size: 18), label: const Text('Generate'))),
      ]),
      const SizedBox(height: 16),
      if (_loading) const Expanded(child: Center(child: CircularProgressIndicator()))
      else ...[
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _statColumn('Total', '${(_summary['total'] ?? 0).toStringAsFixed(1)} Tons'),
          _statColumn('Export', '${(_summary['exportTons'] ?? 0).toStringAsFixed(1)} Tons'),
          _statColumn('Local', '${(_summary['localTons'] ?? 0).toStringAsFixed(1)} Tons'),
          _statColumn('Records', '${_summary['recordCount'] ?? 0}'),
        ]))),
        const SizedBox(height: 12),
        Expanded(child: _daily.isEmpty ? const Center(child: Text('No data')) : Card(
          child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: DataTable(
            columns: _daily.isEmpty ? [] : _daily.first.keys.map((k) => DataColumn(label: Text(k, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)))).toList(),
            rows: _daily.map((r) => DataRow(cells: r.values.map((v) => DataCell(Text(v?.toString() ?? '', style: const TextStyle(fontSize: 12)))).toList())).toList(),
          )),
        )),
      ],
    ]);
  }

  Widget _statColumn(String label, String value) {
    return Column(children: [
      Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
    ]);
  }
}
