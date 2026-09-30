package com.famille.shoppinglist.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "items")
@Data
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category = "Autre";

    private boolean completed = false;

    private String addedBy = "Anonyme";
}
