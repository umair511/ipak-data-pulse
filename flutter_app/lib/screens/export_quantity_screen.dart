import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class ExportQuantityScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const ExportQuantityScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<ExportQuantityScreen> createState() => _ExportQuantityScreenState();
}

class _ExportQuantityScreenState extends State<ExportQuantityScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/export-quantities', {'plantName': widget.plant});
      setState(() { _items = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final dateCtrl = TextEditingController(text: existing?['exportDate'] ?? DateFormat('yyyy-MM-dd').format(DateTime.now()));
    final filmCtrl = TextEditingController(text: existing?['filmCodeName'] ?? '');
    final qtyCtrl = TextEditingController(text: existing?['exportQuantityTons']?.toString() ?? '');

    final result = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text(isEdit ? 'Edit Export' : 'New Export'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Date'), readOnly: true,
          onTap: () async { final d = await showDatePicker(context: ctx, initialDate: DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime(2030));
            if (d != null) dateCtrl.text = DateFormat('yyyy-MM-dd').format(d); }),
        const SizedBox(height: 12),
        TextField(controller: filmCtrl, decoration: const InputDecoration(labelText: 'Film Code')),
        const SizedBox(height: 12),
        TextField(controller: qtyCtrl, decoration: const InputDecoration(labelText: 'Quantity (Tons)'), keyboardType: TextInputType.number),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Create')),
      ],
    ));
    if (result == true) {
      final body = {'exportDate': dateCtrl.text, 'plantName': widget.plant,
          'plantId': widget.plantId,
          'filmCodeId': '', 'filmCodeName': filmCtrl.text, 'exportQuantityTons': double.tryParse(qtyCtrl.text) ?? 0};
      try {
        if (isEdit) await widget.api.patch('/export-quantities/${existing!['id']}', body);
        else await widget.api.post('/export-quantities', body);
        _fetch();
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Export Quantities', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
        ])),
        ElevatedButton.icon(onPressed: () => _showDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New Export')),
      ]),
      const SizedBox(height: 16),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _items.isEmpty ? const Center(child: Text('No exports')) :
        RefreshIndicator(onRefresh: _fetch, child: ListView.builder(itemCount: _items.length, itemBuilder: (ctx, i) {
          final e = _items[i];
          return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
            title: Text('${e['filmCodeName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('${e['exportDate'] ?? ''}'),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Text('${e['exportQuantityTons'] ?? 0} T', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              PopupMenuButton(itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
              ], onSelected: (v) async {
                if (v == 'edit') _showDialog(existing: e);
                if (v == 'delete') { await widget.api.delete('/export-quantities/${e['id']}'); _fetch(); }
              }),
            ]),
          ));
        }))),
    ]);
  }
}
