import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/word_triplet.dart';
import '../services/storage_service.dart';
import '../services/tts_service.dart';
import '../data/starter_pack.dart';
import '../widgets/diacritic_bar.dart';

class VocabScreen extends StatefulWidget {
  const VocabScreen({Key? key}) : super(key: key);

  @override
  State<VocabScreen> createState() => _VocabScreenState();
}

class _VocabScreenState extends State<VocabScreen> {
  final StorageService _storage = StorageService();
  final TtsService _tts = TtsService();

  String _searchQuery = '';
  String _selectedCategory = 'All';

  List<WordTriplet> get _filteredList {
    var list = _storage.cards;
    if (_selectedCategory != 'All') {
      list = list.where((c) => c.category == _selectedCategory).toList();
    }
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase().trim();
      list = list.where((c) =>
          c.en.toLowerCase().contains(q) ||
          c.ro.toLowerCase().contains(q) ||
          c.ru.toLowerCase().contains(q) ||
          c.notes.toLowerCase().contains(q)).toList();
    }
    return list;
  }

  void _openAddWordDialog() {
    final enController = TextEditingController();
    final roController = TextEditingController();
    final ruController = TextEditingController();
    final notesController = TextEditingController();
    String selectedCat = _selectedCategory == 'All' ? kCategories[1] : _selectedCategory;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Add Word Triplet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: selectedCat,
                      decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
                      items: kCategories.where((c) => c != 'All').map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedCat = val);
                      },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: enController,
                      decoration: const InputDecoration(labelText: '🇬🇧 English', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: roController,
                      decoration: const InputDecoration(labelText: '🇷🇴 Romanian', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 6),
                    RomanianDiacriticBar(controller: roController),
                    const SizedBox(height: 10),
                    TextField(
                      controller: ruController,
                      decoration: const InputDecoration(labelText: '🇷🇺 Russian', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: notesController,
                      decoration: const InputDecoration(labelText: 'Context / Notes', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: () {
                        if (enController.text.trim().isEmpty ||
                            roController.text.trim().isEmpty ||
                            ruController.text.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please fill all three languages')),
                          );
                          return;
                        }
                        _storage.addCustomCard(
                          en: enController.text,
                          ro: roController.text,
                          ru: ruController.text,
                          category: selectedCat,
                          notes: notesController.text,
                        );
                        Navigator.pop(context);
                        setState(() {});
                      },
                      child: const Text('Save Card', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredList;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vocabulary Bank', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            tooltip: 'Add Word',
            onPressed: _openAddWordDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search EN, RO, or RU...',
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),

          // Category filter
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: kCategories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final cat = kCategories[idx];
                final isSelected = _selectedCategory == cat;
                return ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('${list.length} triplets found', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ),
          ),

          // Cards List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              itemBuilder: (context, idx) {
                final card = list[idx];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Chip(
                              label: Text(card.category, style: const TextStyle(fontSize: 10)),
                              visualDensity: VisualDensity.compact,
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.grey),
                              onPressed: () {
                                _storage.deleteCard(card.id);
                                setState(() {});
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildLangCol('🇬🇧 EN', card.en, 'en'),
                            _buildLangCol('🇷🇴 RO', card.ro, 'ro', isHighlight: true),
                            _buildLangCol('🇷🇺 RU', card.ru, 'ru'),
                          ],
                        ),
                        if (card.notes.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(card.notes, style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey)),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLangCol(String label, String word, String code, {bool isHighlight = false}) {
    return InkWell(
      onTap: () => _tts.speak(word, code),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(
              word,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: isHighlight ? Theme.of(context).colorScheme.primary : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
