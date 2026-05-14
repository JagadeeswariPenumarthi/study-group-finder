package com.studygroup.studygroup.controller;

import com.studygroup.studygroup.model.Student;
import com.studygroup.studygroup.model.StudyGroup;
import com.studygroup.studygroup.service.StudyGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StudyGroupController {

    @Autowired
    private StudyGroupService service;

    @PostMapping("/groups")
    public StudyGroup createGroup(@RequestBody StudyGroup group) {
        return service.createGroup(group);
    }

    @GetMapping("/groups")
    public List<StudyGroup> getAllGroups() {
        return service.getAllGroups();
    }

    @GetMapping("/groups/search")
    public List<StudyGroup> searchBySubject(@RequestParam String subject) {
        return service.searchBySubject(subject);
    }

    @PostMapping("/students")
    public Student registerStudent(@RequestBody Student student) {
        return service.registerStudent(student);
    }

    @GetMapping("/students")
    public List<Student> getAllStudents() {
        return service.getAllStudents();
    }
}
