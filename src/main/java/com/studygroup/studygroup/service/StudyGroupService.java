package com.studygroup.studygroup.service;

import com.studygroup.studygroup.model.Student;
import com.studygroup.studygroup.model.StudyGroup;
import com.studygroup.studygroup.repository.StudentRepository;
import com.studygroup.studygroup.repository.StudyGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudyGroupService {

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private StudentRepository studentRepository;

    public StudyGroup createGroup(StudyGroup group) {
        return groupRepository.save(group);
    }

    public List<StudyGroup> getAllGroups() {
        return groupRepository.findAll();
    }

    public List<StudyGroup> searchBySubject(String subject) {
        return groupRepository.findAll().stream()
                .filter(g -> g.getSubject().equalsIgnoreCase(subject))
                .toList();
    }

    public Student registerStudent(Student student) {
        return studentRepository.save(student);
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }
}