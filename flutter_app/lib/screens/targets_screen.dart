import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class TargetsScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const TargetsScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<TargetsScreen> createState() => _TargetsScreenState();
}

class _TargetsScreenState extends State<TargetsScreen> {
  List<Map<String, dynamic>> _targets = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/targets', {'plantName': widget.plant});
      setState(() { _targets = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showTargetDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final dateCtrl = TextEditingController(text: existing?['targetDate'] ?? DateFormat('yyyy-MM-dd').format(DateTime.now()));
    String shift = existing?['shift'] ?? 'Morning';
    String machine = existing?['machineName'] ?? '';
    final targetCtrl = TextEditingController(text: existing?['dailyTargetTons']?.toString() ?? '');

    List<String> machines = plantMachines[widget.plant] ?? [];

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(isEdit ? 'Edit Target' : 'New Target'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Date'), readOnly: true,
                  onTap: () async { final d = await showDatePicker(context: ctx, initialDate: DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime(2030));
                    if (d != null) dateCtrl.text = DateFormat('yyyy-MM-dd').format(d); }),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(value: shift, decoration: const InputDecoration(labelText: 'Shift'),
                  items: shifts.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (v) { if (v != null) setDialogState(() => shift = v); }),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(value: machine.isEmpty ? null : machine, decoration: const InputDecoration(labelText: 'Machine'),
                  items: machines.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                  onChanged: (v) { if (v != null) setDialogState(() => machine = v); }),
                const SizedBox(height: 12),
                TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: 'Target (Tons)'), keyboardType: TextInputType.number),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Create')),
          ],
        ),
      ),
    );

    if (result == true) {
      final body = {
        'targetDate': dateCtrl.text, 'shift': shift, 'plantName': widget.plant,
          'plantId': widget.plantId,
        'machineName': machine, 'dailyTargetTons': double.tryParse(targetCtrl.text) ?? 0,
      };
      try {
        if (isEdit) await widget.api.patch('/targets/${existing!['id']}', body);
        else await widget.api.post('/targets', body);
        _fetch();
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
    }
  }

  @override
  Widget build(BuildContext context) {
    final plantColor = hexToColor(plants.firstWhere((p) => p.name == widget.plant, orElse: () => plants[0]).color);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Targets', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
          ])),
          ElevatedButton.icon(onPressed: () => _showTargetDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New Target')),
        ]),
        const SizedBox(height: 16),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) :
          _targets.isEmpty ? const Center(child: Text('No targets set')) :
          RefreshIndicator(
            onRefresh: _fetch,
            child: ListView.builder(
              itemCount: _targets.length,
              itemBuilder: (context, i) {
                final t = _targets[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text('${t['machineName'] ?? 'All'} • ${t['shift'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('${t['targetDate'] ?? ''}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('${t['dailyTargetTons'] ?? 0} T', style: TextStyle(fontWeight: FontWeight.bold, color: plantColor, fontSize: 15)),
                        const Text('Target', style: TextStyle(fontSize: 11)),
                      ]),
                      PopupMenuButton(itemBuilder: (_) => [
                        const PopupMenuItem(value: 'edit', child: Text('Edit')),
                        const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                      ], onSelected: (v) async {
                        if (v == 'edit') _showTargetDialog(existing: t);
                        if (v == 'delete') { await widget.api.delete('/targets/${t['id']}'); _fetch(); }
                      }),
                    ]),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
