import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/plant_config.dart';

class UserManagementScreen extends StatefulWidget {
  final ApiService api;
  const UserManagementScreen({super.key, required this.api});
  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.get('/users');
      setState(() { _users = List<Map<String, dynamic>>.from(data['items'] ?? []); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _showUserDialog({Map<String, dynamic>? existing}) async {
    final isEdit = existing != null;
    final nameCtrl = TextEditingController(text: existing?['name'] ?? '');
    final usernameCtrl = TextEditingController(text: existing?['username'] ?? '');
    final passwordCtrl = TextEditingController();
    String role = existing?['role'] ?? 'operator';

    final result = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
      title: Text(isEdit ? 'Edit User' : 'New User'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name')),
        const SizedBox(height: 12),
        TextField(controller: usernameCtrl, decoration: const InputDecoration(labelText: 'Username'), enabled: !isEdit),
        if (!isEdit) ...[
          const SizedBox(height: 12),
          TextField(controller: passwordCtrl, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
        ],
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: role, decoration: const InputDecoration(labelText: 'Role'),
          items: ['admin', 'supervisor', 'manager', 'operator'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
          onChanged: (v) { if (v != null) setDialogState(() => role = v); }),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(isEdit ? 'Update' : 'Create')),
      ],
    )));
    if (result == true) {
      final body = {'name': nameCtrl.text, 'username': usernameCtrl.text, 'role': role};
      if (!isEdit && passwordCtrl.text.isNotEmpty) body['password'] = passwordCtrl.text;
      try {
        if (isEdit) await widget.api.patch('/users/${existing!['id']}', body);
        else await widget.api.post('/users', body);
        _fetch();
      } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Text('User Management', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold))),
        ElevatedButton.icon(onPressed: () => _showUserDialog(), icon: const Icon(Icons.add, size: 18), label: const Text('New User')),
      ]),
      const SizedBox(height: 16),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _users.isEmpty ? const Center(child: Text('No users')) :
        RefreshIndicator(onRefresh: _fetch, child: ListView.builder(itemCount: _users.length, itemBuilder: (ctx, i) {
          final u = _users[i];
          return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
            leading: CircleAvatar(child: Text((u['name'] ?? '?')[0].toUpperCase())),
            title: Text('${u['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('@${u['username'] ?? ''} • ${u['role'] ?? ''}'),
            trailing: PopupMenuButton(itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Edit')),
              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
            ], onSelected: (v) async {
              if (v == 'edit') _showUserDialog(existing: u);
              if (v == 'delete') {
                final confirm = await showDialog<bool>(context: context, builder: (c) => AlertDialog(title: const Text('Delete user?'), actions: [
                  TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                  TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                ]));
                if (confirm == true) { await widget.api.delete('/users/${u['id']}'); _fetch(); }
              }
            }),
          ));
        }))),
    ]);
  }
}

class PermissionsScreen extends StatefulWidget {
  final ApiService api;
  const PermissionsScreen({super.key, required this.api});
  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> {
  List<Map<String, dynamic>> _allPerms = [];
  Map<String, bool> _selectedPerms = {};
  List<Map<String, dynamic>> _plants = [];
  String _selectedUserId = '';
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([widget.api.get('/permissions/all'), widget.api.get('/users')]);
      _allPerms = List<Map<String, dynamic>>.from(results[0]['items'] ?? []);
      _users = List<Map<String, dynamic>>.from(results[1]['items'] ?? []);
      if (_users.isNotEmpty) {
        _selectedUserId = _users.first['id'];
        await _loadUserPerms();
      }
      setState(() => _loading = false);
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _loadUserPerms() async {
    try {
      final perms = await widget.api.get('/permissions/$_selectedUserId');
      final plants = await widget.api.get('/permissions/$_selectedUserId/plants');
      final current = List<String>.from(perms['permissions'] ?? []);
      _selectedPerms = {for (var p in _allPerms) p['permission']: current.contains(p['permission'])};
      _plants = List<Map<String, dynamic>>.from(plants['plants'] ?? []);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Permissions', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 16),
      if (_loading) const Expanded(child: Center(child: CircularProgressIndicator()))
      else ...[
        DropdownButtonFormField<String>(
          value: _selectedUserId.isEmpty ? null : _selectedUserId,
          decoration: const InputDecoration(labelText: 'Select User', isDense: true),
          items: _users.map((u) => DropdownMenuItem(value: u['id'] as String, child: Text('${u['name']} (${u['username']})'))).toList(),
          onChanged: (v) async { if (v != null) { setState(() => _selectedUserId = v); await _loadUserPerms(); setState(() {}); } },
        ),
        const SizedBox(height: 12),
        Expanded(child: _selectedPerms.isEmpty ? const Center(child: Text('Select a user')) : ListView(
          children: _allPerms.map((p) {
            final perm = p['permission'];
            return SwitchListTile(
              title: Text(p['description'] ?? perm, style: const TextStyle(fontSize: 13)),
              subtitle: Text(p['module'] ?? '', style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
              value: _selectedPerms[perm] ?? false,
              onChanged: (v) => setState(() => _selectedPerms[perm] = v ?? false),
              dense: true,
            );
          }).toList(),
        )),
        Padding(
          padding: const EdgeInsets.all(8),
          child: ElevatedButton(
            onPressed: _selectedUserId.isEmpty ? null : () async {
              final perms = _selectedPerms.entries.where((e) => e.value).map((e) => e.key).toList();
              await widget.api.put('/permissions/$_selectedUserId', {'permissions': perms});
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Permissions saved')));
            },
            child: const Text('Save Permissions'),
          ),
        ),
      ],
    ]);
  }
}

class AuditLogsScreen extends StatefulWidget {
  final ApiService api;
  const AuditLogsScreen({super.key, required this.api});
  @override
  State<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends State<AuditLogsScreen> {
  List<Map<String, dynamic>> _logs = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  int _page = 1;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        widget.api.get('/audit', {'page': _page.toString(), 'limit': '20'}),
        widget.api.get('/audit/stats'),
      ]);
      setState(() {
        _logs = List<Map<String, dynamic>>.from(results[0]['logs'] ?? []);
        _stats = Map<String, dynamic>.from(results[1]['stats'] ?? {});
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Audit Logs', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      if (_stats.isNotEmpty)
        Card(child: Padding(padding: const EdgeInsets.all(12), child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          Column(children: [Text('${_stats['totalLogs'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)), const Text('Total Logs', style: TextStyle(fontSize: 12))]),
          Column(children: [Text('${_stats['last7Days'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)), const Text('Last 7 Days', style: TextStyle(fontSize: 12))]),
        ]))),
      const SizedBox(height: 12),
      Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _logs.isEmpty ? const Center(child: Text('No audit logs')) :
        RefreshIndicator(onRefresh: _fetch, child: ListView.builder(itemCount: _logs.length, itemBuilder: (ctx, i) {
          final log = _logs[i];
          final action = log['action'] ?? '';
          final color = action == 'create' ? Colors.green : action == 'delete' ? Colors.red : Colors.blue;
          return Card(margin: const EdgeInsets.only(bottom: 6), child: ListTile(
            leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Icon(
              action == 'create' ? Icons.add : action == 'delete' ? Icons.delete : Icons.edit, color: color, size: 18)),
            title: Text('${log['module'] ?? ''} — $action', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
            subtitle: Text('${log['userId'] ?? ''} • ${log['createdAt'] ?? ''}', style: const TextStyle(fontSize: 11)),
          ));
        }))),
      if (_logs.isNotEmpty)
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          TextButton(onPressed: _page > 1 ? () { _page--; _fetch(); } : null, child: const Text('Previous')),
          Text('Page $_page'),
          TextButton(onPressed: () { _page++; _fetch(); }, child: const Text('Next')),
        ]),
    ]);
  }
}
