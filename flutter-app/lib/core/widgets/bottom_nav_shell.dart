import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

class BottomNavShell extends StatefulWidget {
  final Widget child;
  
  const BottomNavShell({
    super.key,
    required this.child,
  });

  @override
  State<BottomNavShell> createState() => _BottomNavShellState();
}

class _BottomNavShellState extends State<BottomNavShell> {
  int _selectedIndex = 0;
  
  final List<BottomNavItem> _navItems = [
    BottomNavItem(
      icon: LucideIcons.compass,
      label: 'Koi Hai?',
      route: '/discovery',
    ),
    BottomNavItem(
      icon: LucideIcons.bot,
      label: 'QBOT',
      route: '/qbot',
    ),
    BottomNavItem(
      icon: LucideIcons.helpCircle,
      label: 'Ch13',
      route: '/questions',
    ),
    BottomNavItem(
      icon: LucideIcons.users,
      label: 'Groups',
      route: '/groups',
    ),
    BottomNavItem(
      icon: LucideIcons.user,
      label: 'Profile',
      route: '/profile',
    ),
  ];

  void _onItemTapped(int index) {
    if (index != _selectedIndex) {
      setState(() {
        _selectedIndex = index;
      });
      context.go(_navItems[index].route);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Update selected index based on current route
    final currentRoute = GoRouterState.of(context).uri.path;
    for (int i = 0; i < _navItems.length; i++) {
      if (currentRoute.startsWith(_navItems[i].route)) {
        if (_selectedIndex != i) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            setState(() {
              _selectedIndex = i;
            });
          });
        }
        break;
      }
    }
    
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onItemTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Theme.of(context).colorScheme.surface,
          selectedItemColor: Theme.of(context).colorScheme.primary,
          unselectedItemColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
          selectedFontSize: 12,
          unselectedFontSize: 12,
          items: _navItems.map((item) => BottomNavigationBarItem(
            icon: Icon(item.icon, size: 24),
            activeIcon: Icon(item.icon, size: 26),
            label: item.label,
          )).toList(),
        ),
      ),
    );
  }
}

class BottomNavItem {
  final IconData icon;
  final String label;
  final String route;
  
  BottomNavItem({
    required this.icon,
    required this.label,
    required this.route,
  });
}