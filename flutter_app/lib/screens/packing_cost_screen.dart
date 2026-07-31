import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class PackingCostScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const PackingCostScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<PackingCostScreen> createState() => _PackingCostScreenState();
}

class _PackingCostScreenState extends State<PackingCostScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/packing-costs', {'plantName': widget.plant});
      setState(() { _items = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final monthCtrl = TextEditingController(text: existing?['costMonth'] ?? '');
    final prodCtrl = TextEditingController(text: existing?['totalProductionTons']?.toString() ?? '');
    final totalCostCtrl = TextEditingController(text: existing?['totalCostRs']?.toString() ?? '');
    final bomCtrl = TextEditingController(text: existing?['bomTotalCostRs']?.toString() ?? '');
    final actualCtrl = TextEditingController(text: existing?['actualTotalCostRs']?.toString() ?? '');

    final result = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text(isEdit ? 'Edit Packing Cost' : 'New Packing Cost'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: monthCtrl, decoration: const InputDecoration(labelText: 'Month (YYYY-MM)')),
        const SizedBox(height: 12),
        TextField(controller: prodCtrl, decoration: const InputDecoration(labelText: 'Total Production (Tons)'), keyboardType: TextInputType.number),
        const SizedBox(height: 12),
        TextField(controller: totalCostCtrl, decoration: const InputDecoration(labelText: 'Total Cost (Rs)'), keyboardType: TextInputType.number),
        const SizedBox(height: 12),
        TextField(controller: bomCtrl, decoration: const InputDecoration(labelText: 'BOM Total Cost (Rs)'), keyboardType: TextInputType.number),
        const SizedBox(height: 12),
        TextField(controller: actualCtrl, decoration: const InputDecoration(labelText: 'Actual Total Cost (Rs)'), keyboardType: TextInputType.number),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Create')),
      ],
    ));
    if (result == true) {
      final body = {
        'costMonth': monthCtrl.text, 'plantName': widget.plant,
          'plantId': widget.plantId,
        'totalProductionTons': double.tryParse(prodCtrl.text) ?? 0,
        'totalCostRs': double.tryParse(totalCostCtrl.text) ?? 0,
        'bomTotalCostRs': double.tryParse(bomCtrl.text) ?? 0,
        'actualTotalCostRs': double.tryParse(actualCtrl.text) ?? 0,
      };
      try {
        if (isEdit) await widget.api.patch('/packing-costs/${existing!['id']}', body);
        else await widget.api.post('/packing-costs', body);
        _fetch();
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Packing Cost', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
        ])),
        ElevatedButton.icon(onPressed: () => _showDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New Entry')),
      ]),
      const SizedBox(height: 16),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _items.isEmpty ? const Center(child: Text('No packing cost entries')) :
        RefreshIndicator(onRefresh: _fetch, child: ListView.builder(itemCount: _items.length, itemBuilder: (ctx, i) {
          final c = _items[i];
          return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
            title: Text('${c['costMonth'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('Prod: ${c['totalProductionTons'] ?? 0} T • Cost: Rs ${(c['totalCostRs'] ?? 0).toStringAsFixed(0)}'),
            trailing: PopupMenuButton(itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Edit')),
              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
            ], onSelected: (v) async {
              if (v == 'edit') _showDialog(existing: c);
              if (v == 'delete') { await widget.api.delete('/packing-costs/${c['id']}'); _fetch(); }
            }),
          ));
        }))),
    ]);
  }
}
