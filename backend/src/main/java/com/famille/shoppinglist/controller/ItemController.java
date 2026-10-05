package com.famille.shoppinglist.controller;

import com.famille.shoppinglist.model.Item;
import com.famille.shoppinglist.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @GetMapping
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    @MessageMapping("/add")
    @SendTo("/topic/items")
    public List<Item> addItem(Item item) {
        itemRepository.save(item);
        return itemRepository.findAll();
    }

    @MessageMapping("/toggle")
    @SendTo("/topic/items")
    public List<Item> toggleItem(Long id) {
        itemRepository.findById(id).ifPresent(item -> {
            item.setCompleted(!item.isCompleted());
            itemRepository.save(item);
        });
        return itemRepository.findAll();
    }

    @MessageMapping("/delete")
    @SendTo("/topic/items")
    public List<Item> deleteItem(Long id) {
        itemRepository.deleteById(id);
        return itemRepository.findAll();
    }

    @MessageMapping("/clear-completed")
    @SendTo("/topic/items")
    public List<Item> clearCompleted() {
        List<Item> completedItems = itemRepository.findAll().stream()
                .filter(Item::isCompleted)
                .toList();
        itemRepository.deleteAll(completedItems);
        return itemRepository.findAll();
    }
}