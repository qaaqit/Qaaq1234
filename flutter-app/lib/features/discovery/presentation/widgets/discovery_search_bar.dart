import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class DiscoverySearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onLocationPressed;
  final bool isLoadingLocation;

  const DiscoverySearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onLocationPressed,
    this.isLoadingLocation = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: 'Sailors / Ships / Company',
          prefixIcon: const Icon(LucideIcons.search),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Clear button
              if (controller.text.isNotEmpty)
                IconButton(
                  icon: const Icon(LucideIcons.x),
                  onPressed: () {
                    controller.clear();
                    onChanged('');
                  },
                ),
              
              // Premium crown icon (placeholder)
              IconButton(
                icon: Icon(
                  LucideIcons.crown,
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.6),
                ),
                onPressed: () {
                  // TODO: Implement premium features
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Premium features coming soon!'),
                    ),
                  );
                },
              ),
              
              // Location button
              IconButton(
                icon: isLoadingLocation
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      )
                    : const Icon(LucideIcons.mapPin),
                onPressed: isLoadingLocation ? null : onLocationPressed,
              ),
            ],
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Theme.of(context).colorScheme.surface,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}