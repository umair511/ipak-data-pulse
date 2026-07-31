import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class ProductionEntryScreen extends StatefulWidget {
  final ApiService api;
  final String plant;
  final String plantId;
  const ProductionEntryScreen({super.key, required this.api, required this.plant, required this.plantId});
  @override
  State<ProductionEntryScreen> createState() => _ProductionEntryScreenState();
}

class _ProductionEntryScreenState extends State<ProductionEntryScreen> {
  List<Map<String, dynamic>> _entries = [];
  bool _loading = true;
  String? _filterSection;
  String? _filterShift;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final params = <String, String>{'plantName': widget.plant};
      if (_filterSection != null) params['section'] = _filterSection!;
      if (_filterShift != null) params['shift'] = _filterShift!;
      final data = await widget.api.get('/production-entries', params);
      setState(() { _entries = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showEntryDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final dateCtrl = TextEditingController(text: existing?['entryDate'] ?? DateFormat('yyyy-MM-dd').format(DateTime.now()));
    String shift = existing?['shift'] ?? 'Morning';
    String section = existing?['section'] ?? 'Film Line';
    String machine = existing?['machineName'] ?? '';
    String filmCode = existing?['filmCodeName'] ?? '';
    final prodCtrl = TextEditingController(text: existing?['productionTons']?.toString() ?? '');
    final wasteCtrl = TextEditingController(text: existing?['wasteTons']?.toString() ?? '');
    final downtimeCtrl = TextEditingController(text: existing?['downtimeMinutes']?.toString() ?? '');
    final settingsCtrl = TextEditingController(text: existing?['numberOfSettings']?.toString() ?? '');
    final cyclesCtrl = TextEditingController(text: existing?['numberOfCycles']?.toString() ?? '');

    List<String> machines = plantMachines[widget.plant] ?? [];
    List<String> filteredMachines = machines.where((m) {
      if (section == 'Film Line') return m == 'Film Line';
      if (section == 'Slitter') return m.contains('Slitter');
      if (section == 'Metallizer') return m.contains('Metallizer');
      return true;
    }).toList();
    if (filteredMachines.isEmpty) filteredMachines = machines;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          filteredMachines = machines.where((m) {
            if (section == 'Film Line') return m == 'Film Line';
            if (section == 'Slitter') return m.contains('Slitter');
            if (section == 'Metallizer') return m.contains('Metallizer');
            return true;
          }).toList();
          if (!filteredMachines.contains(machine) && filteredMachines.isNotEmpty) machine = filteredMachines.first;
          return AlertDialog(
            title: Text(isEdit ? 'Edit Production Entry' : 'New Production Entry'),
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
                  DropdownButtonFormField<String>(value: section, decoration: const InputDecoration(labelText: 'Section'),
                    items: sections.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                    onChanged: (v) { if (v != null) setDialogState(() { section = v; }); }),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(value: machine, decoration: const InputDecoration(labelText: 'Machine'),
                    items: filteredMachines.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                    onChanged: (v) { if (v != null) setDialogState(() => machine = v); }),
                  const SizedBox(height: 12),
                  TextField(controller: prodCtrl, decoration: const InputDecoration(labelText: 'Production (Tons)'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  TextField(controller: wasteCtrl, decoration: const InputDecoration(labelText: 'Waste (Tons)'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: TextField(controller: downtimeCtrl, decoration: const InputDecoration(labelText: 'Downtime (min)'), keyboardType: TextInputType.number)),
                    const SizedBox(width: 12),
                    Expanded(child: TextField(controller: settingsCtrl, decoration: const InputDecoration(labelText: 'Settings'), keyboardType: TextInputType.number)),
                  ]),
                  const SizedBox(height: 12),
                  TextField(controller: cyclesCtrl, decoration: const InputDecoration(labelText: 'Cycles'), keyboardType: TextInputType.number),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(isEdit ? 'Update' : 'Create'),
              ),
            ],
          );
        },
      ),
    );

    if (result == true) {
      final body = {
        'entryDate': dateCtrl.text,
        'shift': shift,
        'plantName': widget.plant,
          'plantId': widget.plantId,
          'filmCodeId': '',
        'section': section,
        'machineName': machine,
        'filmCodeName': filmCode,
        'productionTons': double.tryParse(prodCtrl.text) ?? 0,
        'wasteTons': double.tryParse(wasteCtrl.text) ?? 0,
        'downtimeMinutes': int.tryParse(downtimeCtrl.text) ?? 0,
        'numberOfSettings': int.tryParse(settingsCtrl.text) ?? 0,
        'numberOfCycles': int.tryParse(cyclesCtrl.text) ?? 0,
      };
      try {
        if (isEdit) {
          await widget.api.patch('/production-entries/${existing!['id']}', body);
        } else {
          await widget.api.post('/production-entries', body);
        }
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
            Text('Production Entries', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            Text('${widget.plant}', style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
          ])),
          ElevatedButton.icon(onPressed: () => _showEntryDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New Entry')),
        ]),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          SizedBox(width: 150, height: 40, child: DropdownButtonFormField<String>(
            value: _filterSection, isExpanded: true,
            decoration: InputDecoration(contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), hintText: 'Section', isDense: true),
            items: [const DropdownMenuItem(value: null, child: Text('All Sections')), ...sections.map((s) => DropdownMenuItem(value: s, child: Text(s)))],
            onChanged: (v) { setState(() => _filterSection = v); _fetch(); },
          )),
          SizedBox(width: 150, height: 40, child: DropdownButtonFormField<String>(
            value: _filterShift, isExpanded: true,
            decoration: InputDecoration(contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), hintText: 'Shift', isDense: true),
            items: [const DropdownMenuItem(value: null, child: Text('All Shifts')), ...shifts.map((s) => DropdownMenuItem(value: s, child: Text(s)))],
            onChanged: (v) { setState(() => _filterShift = v); _fetch(); },
          )),
        ]),
        const SizedBox(height: 12),
        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator()) :
          _entries.isEmpty ? const Center(child: Text('No entries found')) :
          RefreshIndicator(
            onRefresh: _fetch,
            child: ListView.builder(
              itemCount: _entries.length,
              itemBuilder: (context, i) {
                final e = _entries[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    title: Text('${e['machineName'] ?? ''} • ${e['filmCodeName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('${e['entryDate'] ?? ''} • ${e['shift'] ?? ''} • ${e['section'] ?? ''}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('${e['productionTons'] ?? 0} T', style: TextStyle(fontWeight: FontWeight.bold, color: plantColor, fontSize: 15)),
                        Text('Waste: ${e['wasteTons'] ?? 0} T', style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
                      ]),
                      PopupMenuButton(
                        itemBuilder: (_) => [
                          const PopupMenuItem(value: 'edit', child: Text('Edit')),
                          const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                        ],
                        onSelected: (v) async {
                          if (v == 'edit') _showEntryDialog(existing: e);
                          if (v == 'delete') {
                            final confirm = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Delete entry?'), actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                              TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                            ]));
                            if (confirm == true) { await widget.api.delete('/production-entries/${e['id']}'); _fetch(); }
                          }
                        },
                      ),
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
