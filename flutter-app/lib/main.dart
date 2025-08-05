import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:logger/logger.dart';

import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/logger.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/data/datasources/auth_remote_datasource.dart';
import 'features/discovery/presentation/bloc/discovery_bloc.dart';
import 'features/discovery/data/repositories/discovery_repository_impl.dart';
import 'features/discovery/data/datasources/discovery_remote_datasource.dart';
import 'features/profile/presentation/bloc/profile_bloc.dart';
import 'features/profile/data/repositories/profile_repository_impl.dart';
import 'features/profile/data/datasources/profile_remote_datasource.dart';
import 'core/router/app_router.dart';
import 'core/network/dio_client.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize logger
  AppLogger.init();
  
  runApp(const QaaqConnectApp());
}

class QaaqConnectApp extends StatelessWidget {
  const QaaqConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Initialize HTTP client
    final dioClient = DioClient();
    
    // Initialize repositories
    final authRepository = AuthRepositoryImpl(
      remoteDataSource: AuthRemoteDataSource(dioClient),
    );
    
    final discoveryRepository = DiscoveryRepositoryImpl(
      remoteDataSource: DiscoveryRemoteDataSource(dioClient),
    );
    
    final profileRepository = ProfileRepositoryImpl(
      remoteDataSource: ProfileRemoteDataSource(dioClient),
    );

    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc(authRepository: authRepository),
        ),
        BlocProvider<DiscoveryBloc>(
          create: (context) => DiscoveryBloc(discoveryRepository: discoveryRepository),
        ),
        BlocProvider<ProfileBloc>(
          create: (context) => ProfileBloc(profileRepository: profileRepository),
        ),
      ],
      child: MaterialApp.router(
        title: 'QaaqConnect',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        routerConfig: AppRouter.router,
      ),
    );
  }
}