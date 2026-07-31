import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _usernameController.text = 'admin';
    _passwordController.text = 'admin123';
  }

  Future<void> _submit() async {
    if (_usernameController.text.isEmpty || _passwordController.text.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AppState>().login(_usernameController.text, _passwordController.text);
    } catch (e) {
      setState(() { _error = e.toString().replaceAll('Exception: ', ''); _passwordController.clear(); });
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Theme.of(context).scaffoldBackgroundColor, Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.8)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 8),
                      const Text('IPAK Data Pulse', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('Production Management System', style: TextStyle(fontSize: 14, color: Theme.of(context).textTheme.bodySmall?.color)),
                      const SizedBox(height: 32),
                      if (_error != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.shade200)),
                          child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                        ),
                      TextField(
                        controller: _usernameController,
                        decoration: const InputDecoration(labelText: 'Username', hintText: 'Enter username'),
                        autofocus: true,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => FocusScope.of(context).nextFocus(),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordController,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          labelText: 'Password', hintText: 'Enter password',
                          suffixIcon: IconButton(
                            icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, size: 20),
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                          ),
                        ),
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          child: _loading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Sign In'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text('Enter your username and password to sign in.', style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 8),
                      RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                          children: [
                            const TextSpan(text: 'Developed by '),
                            TextSpan(text: 'Umair Ahmed Khan', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
