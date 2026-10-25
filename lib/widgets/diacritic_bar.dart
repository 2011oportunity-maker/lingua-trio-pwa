import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class RomanianDiacriticBar extends StatefulWidget {
  final TextEditingController controller;

  const RomanianDiacriticBar({Key? key, required this.controller}) : super(key: key);

  @override
  State<RomanianDiacriticBar> createState() => _RomanianDiacriticBarState();
}

class _RomanianDiacriticBarState extends State<RomanianDiacriticBar> {
  bool _isUpperCase = false;

  final List<String> _lower = ['ă', 'â', 'î', 'ș', 'ț'];
  final List<String> _upper = ['Ă', 'Â', 'Î', 'Ș', 'Ț'];

  void _insertChar(String char) {
    HapticFeedback.lightImpact();
    final text = widget.controller.text;
    final selection = widget.controller.selection;

    if (selection.start >= 0 && selection.end >= 0) {
      final newText = text.replaceRange(selection.start, selection.end, char);
      widget.controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: selection.start + char.length),
      );
    } else {
      widget.controller.text = text + char;
      widget.controller.selection = TextSelection.collapsed(offset: widget.controller.text.length);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chars = _isUpperCase ? _upper : _lower;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_upward_rounded,
              size: 20,
              color: _isUpperCase ? Theme.of(context).colorScheme.primary : Colors.grey,
            ),
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() => _isUpperCase = !_isUpperCase);
            },
            visualDensity: VisualDensity.compact,
          ),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: chars.map((char) {
                return InkWell(
                  onTap: () => _insertChar(char),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          offset: const Offset(0, 2),
                          blurRadius: 3,
                        ),
                      ],
                    ),
                    child: Text(
                      char,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
