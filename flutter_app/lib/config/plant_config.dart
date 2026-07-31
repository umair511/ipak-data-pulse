import 'package:flutter/material.dart';

class Plant {
  final String id;
  final String name;
  final String color;
  final String emoji;
  const Plant({required this.id, required this.name, required this.color, required this.emoji});
}

const List<Plant> plants = [
  Plant(id: 'ipak', name: 'IPAK', color: '#16a34a', emoji: '🟢'),
  Plant(id: 'cpak', name: 'CPAK', color: '#dc2626', emoji: '🔴'),
  Plant(id: 'gpak', name: 'GPAK', color: '#2563eb', emoji: '🔵'),
  Plant(id: 'petpak', name: 'PETPAK', color: '#ea580c', emoji: '🟠'),
];

Color hexToColor(String hex) {
  hex = hex.replaceFirst('#', '');
  return Color(int.parse('FF$hex', radix: 16));
}

const Map<String, List<String>> plantMachines = {
  'IPAK': ['Film Line', 'Primary Slitter', 'Secondary Slitter 1', 'Secondary Slitter 2', 'Metallizer Slitter', 'Metallizer'],
  'CPAK': ['Film Line', 'Cast Slitter', 'Metallizer'],
  'GPAK': ['Film Line', 'Primary Slitter', 'Secondary Slitter', 'Metallizer Slitter', 'Metallizer'],
  'PETPAK': ['Film Line', 'Primary Slitter', 'Secondary Slitter', 'Metallizer'],
};

const List<String> shifts = ['Morning', 'Evening', 'Night'];
const List<String> sections = ['Film Line', 'Slitter', 'Metallizer'];
const List<String> reportTypes = [
  'Overall Production', 'Film-wise Production', 'Machine-wise Production',
  'Waste', 'Downtime', 'Target', 'Settings', 'Cycles',
];

const List<Map<String, String>> navItems = [
  {'label': 'Dashboard', 'path': 'dashboard', 'icon': 'dashboard'},
  {'label': 'Production Entry', 'path': 'production', 'icon': 'clipboard_list'},
  {'label': 'Targets', 'path': 'targets', 'icon': 'target'},
  {'label': 'Reports', 'path': 'reports', 'icon': 'file_text'},
  {'label': 'Analytics', 'path': 'analytics', 'icon': 'bar_chart'},
  {'label': 'Export Quantity', 'path': 'export', 'icon': 'ship'},
  {'label': 'Dispatch', 'path': 'dispatch', 'icon': 'truck'},
  {'label': 'Dispatch Report', 'path': 'dispatch_report', 'icon': 'truck'},
  {'label': 'Packing Cost', 'path': 'packing', 'icon': 'package'},
  {'label': 'Masters', 'path': 'masters', 'icon': 'database', 'adminOnly': 'true'},
  {'label': 'User Management', 'path': 'users', 'icon': 'users', 'adminOnly': 'true'},
  {'label': 'Permissions', 'path': 'permissions', 'icon': 'shield', 'adminOnly': 'true'},
  {'label': 'Audit Logs', 'path': 'audit', 'icon': 'scroll_text', 'adminOnly': 'true'},
];
