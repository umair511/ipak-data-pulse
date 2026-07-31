import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class MastersScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const MastersScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<MastersScreen> createState() => _MastersScreenState();
}

class _MastersScreenState extends State<MastersScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _machines = [];
  List<Map<String, dynamic>> _filmCodes = [];
  List<Map<String, dynamic>> _downtimeReasons = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        widget.api.get('/machines', {'plantName': widget.plant}),
        widget.api.get('/film-codes', {'plantId': widget.plantId}),
        widget.api.get('/downtime-reasons'),
      ]);
      setState(() {
        _machines = List<Map<String, dynamic>>.from(results[0]['items'] ?? []);
        _filmCodes = List<Map<String, dynamic>>.from(results[1]['items'] ?? []);
        _downtimeReasons = List<Map<String, dynamic>>.from(results[2]['items'] ?? []);
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _addMachine() async {
    final nameCtrl = TextEditingController();
    String section = 'Film Line';
    final result = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
      title: const Text('Add Machine'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Machine Name')),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: section, decoration: const InputDecoration(labelText: 'Section'),
          items: sections.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          onChanged: (v) { if (v != null) setDialogState(() => section = v); }),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
      ],
    )));
    if (result == true && nameCtrl.text.isNotEmpty) {
      await widget.api.post('/machines', {'machineName': nameCtrl.text, 'plantName': widget.plant, 'section': section, 'plantId': widget.plantId});
      _fetch();
    }
  }

  Future<void> _addFilmCode() async {
    final nameCtrl = TextEditingController();
    final result = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Add Film Code'),
      content: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Film Code Name')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
      ],
    ));
    if (result == true && nameCtrl.text.isNotEmpty) {
      await widget.api.post('/film-codes', {'filmCodeName': nameCtrl.text, 'plantName': widget.plant, 'plantId': widget.plantId});
      _fetch();
    }
  }

  Future<void> _addDowntimeReason() async {
    final nameCtrl = TextEditingController();
    final result = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Add Downtime Reason'),
      content: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Reason Label')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
      ],
    ));
    if (result == true && nameCtrl.text.isNotEmpty) {
      await widget.api.post('/downtime-reasons', {'reasonLabel': nameCtrl.text});
      _fetch();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Masters', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      Text(widget.plant, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
      const SizedBox(height: 12),
      TabBar(controller: _tabController, tabs: const [Tab(text: 'Machines'), Tab(text: 'Film Codes'), Tab(text: 'Downtime Reasons')]),
      const SizedBox(height: 8),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : TabBarView(controller: _tabController, children: [
        _buildList(_machines, (m) => m['machineName'] ?? '', (m) => m['section'] ?? '', () => _addMachine(), (m) => '/machines/${m['id']}'),
        _buildList(_filmCodes, (m) => m['filmCodeName'] ?? '', (m) => m['status'] ?? '', () => _addFilmCode(), (m) => '/film-codes/${m['id']}'),
        _buildList(_downtimeReasons, (m) => m['reasonLabel'] ?? '', (m) => '', () => _addDowntimeReason(), (m) => '/downtime-reasons/${m['id']}'),
      ])),
    ]);
  }

  Widget _buildList(List<Map<String, dynamic>> items, String Function(Map<String, dynamic>) titleFn, String Function(Map<String, dynamic>) subtitleFn, VoidCallback onAdd, String Function(Map<String, dynamic>) deletePath) {
    return Column(children: [
      Align(alignment: Alignment.centerRight, child: Padding(padding: const EdgeInsets.only(bottom: 8),
        child: ElevatedButton.icon(onPressed: onAdd, icon: const Icon(Icons.add, size: 18), label: const Text('Add')))),
      Expanded(child: items.isEmpty ? const Center(child: Text('No items')) : ListView.builder(itemCount: items.length, itemBuilder: (ctx, i) {
        final item = items[i];
        return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
          title: Text(titleFn(item), style: const TextStyle(fontWeight: FontWeight.w500)),
          subtitle: Text(subtitleFn(item)),
          trailing: IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red), onPressed: () async {
            final confirm = await showDialog<bool>(context: context, builder: (c) => AlertDialog(title: const Text('Delete?'), actions: [
              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
            ]));
            if (confirm == true) { await widget.api.delete(deletePath(item)); _fetch(); }
          }),
        ));
      })),
    ]);
  }

  @override
  void dispose() { _tabController.dispose(); super.dispose(); }
}
