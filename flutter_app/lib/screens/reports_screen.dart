import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class ReportsScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const ReportsScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _reportType = 'Overall Production';
  String? _section;
  DateTime _dateFrom = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _dateTo = DateTime.now();
  List<Map<String, dynamic>> _data = [];
  bool _loading = false;

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final params = <String, String>{
        'reportType': _reportType,
        'plant': widget.plant,
        'dateFrom': DateFormat('yyyy-MM-dd').format(_dateFrom),
        'dateTo': DateFormat('yyyy-MM-dd').format(_dateTo),
      };
      if (_section != null) params['section'] = _section!;
      final data = await widget.api.get('/reports', params);
      setState(() { _data = List<Map<String, dynamic>>.from(data['data'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Reports', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Wrap(spacing: 12, runSpacing: 12, children: [
          SizedBox(width: 200, child: DropdownButtonFormField<String>(
            value: _reportType, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Report Type', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            items: reportTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
            onChanged: (v) { if (v != null) setState(() => _reportType = v); },
          )),
          SizedBox(width: 160, child: DropdownButtonFormField<String>(
            value: _section, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Section', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            items: [const DropdownMenuItem(value: null, child: Text('All Sections')), ...sections.map((s) => DropdownMenuItem(value: s, child: Text(s)))],
            onChanged: (v) => setState(() => _section = v),
          )),
          SizedBox(width: 150, child: GestureDetector(
            onTap: () async { final d = await showDatePicker(context: context, initialDate: _dateFrom, firstDate: DateTime(2024), lastDate: DateTime(2030));
              if (d != null) setState(() => _dateFrom = d); },
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'From', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
              child: Text(DateFormat('yyyy-MM-dd').format(_dateFrom)),
            ),
          )),
          SizedBox(width: 150, child: GestureDetector(
            onTap: () async { final d = await showDatePicker(context: context, initialDate: _dateTo, firstDate: DateTime(2024), lastDate: DateTime(2030));
              if (d != null) setState(() => _dateTo = d); },
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'To', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
              child: Text(DateFormat('yyyy-MM-dd').format(_dateTo)),
            ),
          )),
          SizedBox(height: 40, child: ElevatedButton.icon(onPressed: _fetch, icon: const Icon(Icons.search, size: 18), label: const Text('Generate'))),
        ]),
        const SizedBox(height: 16),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) :
          _data.isEmpty ? const Center(child: Text('No data. Click Generate to run report.')) :
          Card(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: _buildColumns(),
                rows: _data.map((row) => DataRow(cells: _buildCells(row))).toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  List<DataColumn> _buildColumns() {
    if (_data.isEmpty) return [];
    return _data.first.keys.map((k) => DataColumn(label: Text(k, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)))).toList();
  }

  List<DataCell> _buildCells(Map<String, dynamic> row) {
    return row.values.map((v) => DataCell(Text(v?.toString() ?? '', style: const TextStyle(fontSize: 12)))).toList();
  }
}
