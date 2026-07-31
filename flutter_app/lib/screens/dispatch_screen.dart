import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class DispatchScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const DispatchScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<DispatchScreen> createState() => _DispatchScreenState();
}

class _DispatchScreenState extends State<DispatchScreen> {
  List<Map<String, dynamic>> _dispatches = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/dispatch/list', {'plantName': widget.plant});
      setState(() { _dispatches = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final dateCtrl = TextEditingController(text: existing?['dispatchDate'] ?? DateFormat('yyyy-MM-dd').format(DateTime.now()));
    final customerCtrl = TextEditingController(text: existing?['customerName'] ?? '');
    final filmCtrl = TextEditingController(text: existing?['filmCodeName'] ?? '');
    final qtyCtrl = TextEditingController(text: existing?['quantityTons']?.toString() ?? '');
    final vehicleCtrl = TextEditingController(text: existing?['vehicleNumber'] ?? '');
    String dispatchType = existing?['dispatchType'] ?? 'Local';

    final result = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
      title: Text(isEdit ? 'Edit Dispatch' : 'New Dispatch'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Date'), readOnly: true,
          onTap: () async { final d = await showDatePicker(context: ctx, initialDate: DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime(2030));
            if (d != null) dateCtrl.text = DateFormat('yyyy-MM-dd').format(d); }),
        const SizedBox(height: 12),
        TextField(controller: customerCtrl, decoration: const InputDecoration(labelText: 'Customer Name')),
        const SizedBox(height: 12),
        TextField(controller: filmCtrl, decoration: const InputDecoration(labelText: 'Film Code')),
        const SizedBox(height: 12),
        TextField(controller: qtyCtrl, decoration: const InputDecoration(labelText: 'Quantity (Tons)'), keyboardType: TextInputType.number),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: dispatchType, decoration: const InputDecoration(labelText: 'Type'),
          items: ['Local', 'Export'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
          onChanged: (v) { if (v != null) setDialogState(() => dispatchType = v); }),
        const SizedBox(height: 12),
        TextField(controller: vehicleCtrl, decoration: const InputDecoration(labelText: 'Vehicle Number (optional)')),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Create')),
      ],
    )));
    if (result == true) {
      final body = {'dispatchDate': dateCtrl.text, 'customerName': customerCtrl.text, 'filmCodeName': filmCtrl.text,
        'quantityTons': double.tryParse(qtyCtrl.text) ?? 0, 'dispatchType': dispatchType, 'plantName': widget.plant,
          'plantId': widget.plantId, 'vehicleNumber': vehicleCtrl.text};
      try {
        if (isEdit) await widget.api.patch('/dispatch/${existing!['id']}', body);
        else await widget.api.post('/dispatch', body);
        _fetch();
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
    }
  }

  @override
  Widget build(BuildContext context) {
    final plantColor = hexToColor(plants.firstWhere((p) => p.name == widget.plant, orElse: () => plants[0]).color);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Dispatch', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
        ])),
        ElevatedButton.icon(onPressed: () => _showDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New Dispatch')),
      ]),
      const SizedBox(height: 16),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _dispatches.isEmpty ? const Center(child: Text('No dispatches')) :
        RefreshIndicator(onRefresh: _fetch, child: ListView.builder(itemCount: _dispatches.length, itemBuilder: (ctx, i) {
          final d = _dispatches[i];
          final isExport = d['dispatchType'] == 'Export';
          return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
            leading: CircleAvatar(backgroundColor: isExport ? Colors.green.shade50 : Colors.orange.shade50,
              child: Icon(isExport ? Icons.language : Icons.location_on, color: isExport ? Colors.green : Colors.orange, size: 20)),
            title: Text('${d['customerName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('${d['dispatchDate'] ?? ''} • ${d['filmCodeName'] ?? ''} • ${d['dispatchType'] ?? ''}'),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Text('${d['quantityTons'] ?? 0} T', style: TextStyle(fontWeight: FontWeight.bold, color: plantColor, fontSize: 15)),
              PopupMenuButton(itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
              ], onSelected: (v) async {
                if (v == 'edit') _showDialog(existing: d);
                if (v == 'delete') { await widget.api.delete('/dispatch/${d['id']}'); _fetch(); }
              }),
            ]),
          ));
        }))),
    ]);
  }
}
