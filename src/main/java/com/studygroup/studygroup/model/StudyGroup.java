package com.studygroup.studygroup.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class StudyGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String groupName;
    private String subject;
    private String schedule;
    private String location;
    private int maxMembers;
}
