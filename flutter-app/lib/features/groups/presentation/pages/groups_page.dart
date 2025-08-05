import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/groups_bloc.dart';
import '../widgets/group_card.dart';
import '../widgets/cpss_navigator.dart';

class GroupsPage extends StatefulWidget {
  const GroupsPage({super.key});

  @override
  State<GroupsPage> createState() => _GroupsPageState();
}

class _GroupsPageState extends State<GroupsPage> with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    context.read<GroupsBloc>().add(LoadGroups());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Maritime Groups'),
        backgroundColor: const Color(0xFF0891B2),
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'CPSS Navigator'),
            Tab(text: 'My Groups'),
            Tab(text: 'Discover'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // CPSS Navigator Tab
          const CPSSNavigator(),

          // My Groups Tab
          BlocBuilder<GroupsBloc, GroupsState>(
            builder: (context, state) {
              if (state is GroupsLoading) {
                return const Center(
                  child: CircularProgressIndicator(),
                );
              }

              if (state is GroupsError) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Error: ${state.message}',
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          context.read<GroupsBloc>().add(LoadGroups());
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                );
              }

              if (state is GroupsLoaded) {
                final myGroups = state.groups.where((g) => g.isMember).toList();

                if (myGroups.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.group_off,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No groups joined yet',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Discover and join maritime groups!',
                          style: TextStyle(
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: myGroups.length,
                  itemBuilder: (context, index) {
                    final group = myGroups[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GroupCard(
                        group: group,
                        onTap: () {
                          Navigator.of(context).pushNamed('/group/${group.id}');
                        },
                      ),
                    );
                  },
                );
              }

              return const SizedBox.shrink();
            },
          ),

          // Discover Tab
          BlocBuilder<GroupsBloc, GroupsState>(
            builder: (context, state) {
              if (state is GroupsLoading) {
                return const Center(
                  child: CircularProgressIndicator(),
                );
              }

              if (state is GroupsLoaded) {
                final allGroups = state.groups;

                if (allGroups.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No groups available',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: allGroups.length,
                  itemBuilder: (context, index) {
                    final group = allGroups[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GroupCard(
                        group: group,
                        onTap: () {
                          Navigator.of(context).pushNamed('/group/${group.id}');
                        },
                        showJoinButton: !group.isMember,
                        onJoin: () {
                          context.read<GroupsBloc>().add(JoinGroup(group.id));
                        },
                      ),
                    );
                  },
                );
              }

              return const SizedBox.shrink();
            },
          ),
        ],
      ),
    );
  }
}