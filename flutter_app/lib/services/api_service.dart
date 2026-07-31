import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3001/api';
  String? _accessToken;
  String? _refreshToken;
  String? _userId;

  Future<Map<String, String>> get _headers async {
    if (_accessToken == null) await _loadTokens();
    return {
      'Content-Type': 'application/json',
      if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
    };
  }

  Future<void> _loadTokens() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('access_token');
    _refreshToken = prefs.getString('refresh_token');
    _userId = prefs.getString('user_id');
  }

  Future<void> _saveTokens(String access, String refresh, String userId) async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = access;
    _refreshToken = refresh;
    _userId = userId;
    await prefs.setString('access_token', access);
    await prefs.setString('refresh_token', refresh);
    await prefs.setString('user_id', userId);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    _userId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_id');
    await prefs.remove('user_name');
    await prefs.remove('user_role');
  }

  Future<bool> isLoggedIn() async {
    await _loadTokens();
    if (_accessToken == null) return false;
    try {
      final resp = await get('/auth/me');
      return resp.containsKey('user');
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = _handleResponse(response);
    if (data['ok'] == true && data['accessToken'] != null) {
      await _saveTokens(data['accessToken'], data['refreshToken'], data['user']['id']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_name', data['user']['name'] ?? '');
      await prefs.setString('user_role', data['user']['role'] ?? '');
      await prefs.setString('user_username', data['user']['username'] ?? '');
    }
    return data;
  }

  Future<void> logout() async {
    try {
      final h = await _headers;
      await http.post(Uri.parse('$baseUrl/auth/logout'), headers: h,
          body: jsonEncode({'refreshToken': _refreshToken}));
    } catch (_) {}
    await clearTokens();
  }

  Future<Map<String, dynamic>> get(String path, [Map<String, String>? queryParams]) async {
    final h = await _headers;
    var url = '$baseUrl$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      final qs = queryParams.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&');
      url += '?$qs';
    }
    final response = await http.get(Uri.parse(url), headers: h);
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) async {
    final h = await _headers;
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: h,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> put(String path, [Map<String, dynamic>? body]) async {
    final h = await _headers;
    final response = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: h,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> patch(String path, [Map<String, dynamic>? body]) async {
    final h = await _headers;
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: h,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final h = await _headers;
    final response = await http.delete(Uri.parse('$baseUrl$path'), headers: h);
    return _handleResponse(response);
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body is Map<String, dynamic> ? body : {'data': body};
    }
    throw ApiException(response.statusCode, body['message'] ?? body['error'] ?? 'Request failed');
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException($statusCode): $message';
}
