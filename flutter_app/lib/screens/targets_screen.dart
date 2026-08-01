import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';
import '../main.dart';

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
  List<Map<String, dynamic>> _slitterMachines = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resTargets = await widget.api.get('/targets', {'plantName': widget.plant});
      final resMachines = await widget.api.get('/machines', {'plantName': widget.plant, 'section': 'Slitter'});
      setState(() {
        _targets = List<Map<String, dynamic>>.from(resTargets['items'] ?? resTargets['data'] ?? []);
        _slitterMachines = List<Map<String, dynamic>>.from(resMachines['items'] ?? resMachines['data'] ?? []);
        _loading = false;
      });
    } catch (e) {
      setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Color _plantColor() {
    try {
      return hexToColor(plants.firstWhere((p) => p.name == widget.plant, orElse: () => plants[0]).color);
    } catch (_) { return Colors.green; }
  }

  Future<void> _showTargetDialog({Map<String, dynamic>? existing}) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final isAdmin = appState.currentUser?['role'] == 'admin';
    final canAdd = isAdmin || appState.permissions.contains('targets.create');
    final canEdit = isAdmin || appState.permissions.contains('targets.edit');

    final isEdit = existing != null;
    if (isEdit && !canEdit) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No permission to edit targets.'))); return; }
    if (!isEdit && !canAdd) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No permission to create targets.'))); return; }

    final TextEditingController dateCtrl = TextEditingController(text: existing?['targetDate'] ?? DateFormat('yyyy-MM-dd').format(DateTime.now()));
    String shift = existing?['shift'] ?? 'Morning';
    String machine = existing?['machineName'] ?? '';
    final TextEditingController targetCtrl = TextEditingController(text: existing?['dailyTargetTons']?.toString() ?? '');

    List<String> machineNames = _slitterMachines.map((m) => (m['machineName'] ?? m['machine_name'] ?? m['name']).toString()).toList();
    if (machineNames.isEmpty) machineNames = plantMachines[widget.plant] ?? [];

    final result = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
      title: Text(isEdit ? 'Edit Target' : 'Set Target'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Date *'), readOnly: true,
          onTap: () async { final d = await showDatePicker(context: ctx, initialDate: DateTime.tryParse(dateCtrl.text) ?? DateTime.now(), firstDate: DateTime(2020), lastDate: DateTime(2100)); if (d != null) setDialogState(() => dateCtrl.text = DateFormat('yyyy-MM-dd').format(d)); }),
        const SizedBox(height: 12),
        Wrap(spacing: 8, children: [ for (final s in shifts) ChoiceChip(label: Text(s), selected: shift==s, onSelected: (_) => setDialogState(()=>shift=s)) ]),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: machine.isEmpty ? null : machine, decoration: const InputDecoration(labelText: 'Slitter Machine *'),
          items: machineNames.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(), onChanged: (v) => setDialogState(()=>machine = v ?? ''), ),
        const SizedBox(height: 12),
        TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: 'Target (Tons) *'), keyboardType: TextInputType.number),
      ])),
      actions: [ TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Save')) ],
    )));

    if (result != true) return;

    final dailyTarget = double.tryParse(targetCtrl.text) ?? 0;
    if (dateCtrl.text.isEmpty || shift.isEmpty || machine.isEmpty || dailyTarget <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all required fields and ensure target > 0')));
      return;
    }

    final payload = {
      'targetDate': dateCtrl.text,
      'shift': shift,
      'plantId': widget.plantId,
      'plantName': widget.plant,
      'machineId': null,
      'machineName': machine,
      'dailyTargetTons': dailyTarget,
      'createdByName': Provider.of<AppState>(context, listen: false).currentUser?['name'] ?? '',
    };

    try {
      if (isEdit && existing != null) await widget.api.patch('/targets/${existing['id']}', payload);
      else await widget.api.post('/targets', payload);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Target saved')));
      await _fetch();
    } catch (e) {
      final msg = (e is ApiException) ? e.message : e.toString();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save failed: $msg')));
    }
  }

  Future<void> _deleteTarget(Map<String, dynamic> t) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final isAdmin = appState.currentUser?['role'] == 'admin';
    final canDelete = isAdmin || appState.permissions.contains('targets.delete');
    if (!canDelete) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No permission to delete targets.'))); return; }

    final confirm = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Delete this target?'), actions: [TextButton(onPressed: ()=>Navigator.pop(ctx,false), child: const Text('Cancel')), TextButton(onPressed: ()=>Navigator.pop(ctx,true), child: const Text('Delete', style: TextStyle(color: Colors.red))) ]));
    if (confirm != true) return;

    try {
      await widget.api.delete('/targets/${t['id']}');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Target deleted')));
      await _fetch();
    } catch (e) {
      final msg = (e is ApiException) ? e.message : e.toString();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Delete failed: $msg')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final plantColor = _plantColor();
    final appState = Provider.of<AppState>(context);
    final isAdmin = appState.currentUser?['role'] == 'admin';
    final canAdd = isAdmin || appState.permissions.contains('targets.create');
    final canEdit = isAdmin || appState.permissions.contains('targets.edit');
    final canDelete = isAdmin || appState.permissions.contains('targets.delete');

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Targets', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)), const SizedBox(height:4), Text('${widget.plant} — Shift-wise Slitter targets', style: TextStyle(color: Theme.of(context).hintColor))])),
        if (canAdd) ElevatedButton.icon(onPressed: () => _showTargetDialog(), icon: const Icon(Icons.add), label: const Text('Set Target'), style: ElevatedButton.styleFrom(backgroundColor: plantColor)),
      ])),
      if (_error != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Card(color: Colors.red.shade50, child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [Icon(Icons.error, color: Colors.red), const SizedBox(width:8), Expanded(child: Text(_error!)), TextButton(onPressed: _fetch, child: const Text('Retry'))])))),
      Expanded(child: _loading ? Center(child: CircularProgressIndicator(color: plantColor)) : _targets.isEmpty ? Center(child: Text('No targets set', style: TextStyle(color: Theme.of(context).hintColor))) : RefreshIndicator(onRefresh: _fetch, child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: _targets.length.clamp(0,200), itemBuilder: (context,i) {
        final t = _targets[i];
        return Card(margin: const EdgeInsets.only(bottom:8), child: ListTile(title: Text('${t['machineName'] ?? 'All'} • ${t['shift'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)), subtitle: Text('${t['targetDate'] ?? ''}'), trailing: Row(mainAxisSize: MainAxisSize.min, children: [ Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [ Text('${(t['dailyTargetTons'] ?? 0).toStringAsFixed(1)} T', style: TextStyle(fontWeight: FontWeight.bold, color: plantColor, fontSize: 15)), const Text('Target', style: TextStyle(fontSize:11)) ]), const SizedBox(width:8), PopupMenuButton<String>(onSelected: (v) async { if (v=='edit') { if (canEdit) _showTargetDialog(existing: t); else ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No permission to edit.'))); } if (v=='delete') { if (canDelete) _deleteTarget(t); else ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No permission to delete.'))); } }, itemBuilder: (_)=> [ const PopupMenuItem(value:'edit', child: Text('Edit')), const PopupMenuItem(value:'delete', child: Text('Delete', style: TextStyle(color: Colors.red))) ] ) ]));
      })))
    ]);
  }
}
