import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/discovery/presentation/pages/discovery_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/chat/presentation/pages/chat_list_page.dart';
import '../../features/chat/presentation/pages/chat_page.dart';
import '../../features/qbot/presentation/pages/qbot_chat_page.dart';
import '../../features/questions/presentation/pages/questions_page.dart';
import '../../features/groups/presentation/pages/groups_page.dart';
import '../widgets/bottom_nav_shell.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/discovery',
    redirect: (context, state) {
      final authBloc = context.read<AuthBloc>();
      final isAuthenticated = authBloc.state is AuthSuccess;
      
      // If not authenticated and not on login page, redirect to login
      if (!isAuthenticated && state.fullPath != '/login') {
        return '/login';
      }
      
      // If authenticated and on login page, redirect to discovery
      if (isAuthenticated && state.fullPath == '/login') {
        return '/discovery';
      }
      
      return null;
    },
    routes: [
      // Login Route
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      
      // Main Shell with Bottom Navigation
      ShellRoute(
        builder: (context, state, child) => BottomNavShell(child: child),
        routes: [
          // Discovery Page (Koi Hai?)
          GoRoute(
            path: '/discovery',
            builder: (context, state) => const DiscoveryPage(),
          ),
          
          // QBOT Chat Page
          GoRoute(
            path: '/qbot',
            builder: (context, state) => const QBOTChatPage(),
          ),
          
          // Questions Page (Channel 13)
          GoRoute(
            path: '/questions',
            builder: (context, state) => const QuestionsPage(),
          ),
          
          // Groups Page
          GoRoute(
            path: '/groups',
            builder: (context, state) => const GroupsPage(),
          ),
          
          // Chat List Page
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ChatListPage(),
          ),
          
          // Profile Page
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
      
      // Individual Chat Page
      GoRoute(
        path: '/chat/:userId',
        builder: (context, state) {
          final userId = state.pathParameters['userId']!;
          final userName = state.uri.queryParameters['name'] ?? 'Chat';
          return ChatPage(userId: userId, userName: userName);
        },
      ),
    ],
  );
}